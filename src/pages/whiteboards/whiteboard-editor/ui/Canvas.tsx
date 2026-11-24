"use client";

import "@excalidraw/excalidraw/index.css";
import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  CaptureUpdateAction,
  Excalidraw,
  hashElementsVersion,
  reconcileElements,
  restoreElements,
  viewportCoordsToSceneCoords,
} from "@excalidraw/excalidraw";
import type {
  OrderedExcalidrawElement,
  ExcalidrawElement,
} from "@excalidraw/excalidraw/element/types";
import type { RemoteExcalidrawElement } from "@excalidraw/excalidraw/data/reconcile";
import type {
  AppState,
  Collaborator,
  ExcalidrawImperativeAPI,
  SocketId,
} from "@excalidraw/excalidraw/types";
import {
  whiteboardApi,
  whiteboardErrorMessage,
  type WhiteboardDetail,
  type WhiteboardScene,
} from "@/entities/whiteboard";
import { normalizeApiError } from "@/shared/api";
import { readTheme, subscribeTheme } from "@/shared/lib";
import {
  restoreOnto,
  selectedIds,
  sharedAppState,
  toCollaborators,
} from "../model/scene";

export type SaveState = "saved" | "dirty" | "saving" | "error";

export type CanvasControls = {
  /** 요소를 골라 화면 가운데로 옮긴다(댓글에서 요소로 가기). */
  readonly focus: (elementId: string) => void;
  /** 이력의 scene 으로 바꾸고 곧바로 저장한다. */
  readonly restore: (scene: WhiteboardScene) => void;
};

const SAVE_DELAY = 2_000;
const PRESENCE_INTERVAL = 1_000;

type Props = {
  readonly board: WhiteboardDetail;
  readonly editable: boolean;
  readonly onReady: (controls: CanvasControls) => void;
  readonly onSaveState: (state: SaveState, message?: string) => void;
  readonly onSelection: (ids: readonly string[]) => void;
  /** 다른 사람의 저장을 받아 왔을 때(제목·권한도 바뀌었을 수 있다). */
  readonly onRemote: (board: WhiteboardDetail) => void;
  readonly onGone: (message: string) => void;
};

const restore = (scene: WhiteboardScene) =>
  restoreElements(
    scene.elements as readonly ExcalidrawElement[],
    null,
  ) as OrderedExcalidrawElement[];

/**
 * Excalidraw 와 서버를 잇는다(D10-5, D10-12).
 * - 편집이 2초 멈추면 baseVersion 과 함께 저장한다. 409 면 최신을 받아 병합하고 다시 저장한다.
 * - 1초마다 커서를 보내고, 응답 version 이 내 것보다 크면 최신을 받아 병합한다.
 * 병합은 Excalidraw reconcileElements(요소마다 version 이 높은 쪽)라 저장 안 한 내 변경도 남는다.
 */
export default function Canvas({
  board,
  editable,
  onReady,
  onSaveState,
  onSelection,
  onRemote,
  onGone,
}: Props) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const theme = useSyncExternalStore<"light" | "dark">(
    subscribeTheme,
    readTheme,
    () => "light",
  );
  const crispFrame = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (crispFrame.current !== null) cancelAnimationFrame(crispFrame.current);
    },
    [],
  );
  const version = useRef(board.version);
  const savedHash = useRef(hashElementsVersion(restore(board.scene)));
  /** 400·413 으로 거부된 내용. 같은 내용을 2초마다 다시 보내지 않는다. */
  const rejectedHash = useRef<number | null>(null);
  const saving = useRef(false);
  const pulling = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const selection = useRef("");
  const seenHash = useRef<number | null>(null);
  const callbacks = useRef({ onSaveState, onSelection, onRemote, onGone });
  const editableRef = useRef(editable);
  useEffect(() => {
    callbacks.current = { onSaveState, onSelection, onRemote, onGone };
    editableRef.current = editable;
  });

  const engine = useRef({
    schedule(delay = SAVE_DELAY) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void engine.current.save(), delay);
    },
    async save() {
      const api = apiRef.current;
      if (!api || !editableRef.current) return;
      if (saving.current || pulling.current) return engine.current.schedule();
      const elements = api.getSceneElementsIncludingDeleted();
      const hash = hashElementsVersion(elements);
      if (hash === savedHash.current)
        return callbacks.current.onSaveState("saved");
      saving.current = true;
      callbacks.current.onSaveState("saving");
      try {
        // ponytail: 지운 요소(isDeleted)도 함께 보낸다. 빼면 다른 화면이 병합하며 되살린다. 1MB 상한에 닿으면 오래된 지움부터 정리한다.
        const saved = await whiteboardApi.saveScene(board.id, version.current, {
          elements,
          appState: sharedAppState(api.getAppState()),
        });
        version.current = saved.version;
        savedHash.current = hash;
        rejectedHash.current = null;
        const now = hashElementsVersion(api.getSceneElementsIncludingDeleted());
        if (now === hash) callbacks.current.onSaveState("saved");
        else {
          callbacks.current.onSaveState("dirty");
          engine.current.schedule();
        }
      } catch (error) {
        const problem = normalizeApiError(error);
        if (problem.code === "WHITEBOARD_CONFLICT") {
          saving.current = false;
          await engine.current.pull();
          return;
        }
        if (problem.status === 404) {
          callbacks.current.onGone(whiteboardErrorMessage(error));
        } else if (problem.status >= 400 && problem.status < 500) {
          rejectedHash.current = hash;
        } else {
          // 네트워크·5xx 는 잠시 뒤 다시 시도한다. 내 변경은 화면에 남아 있다.
          engine.current.schedule(SAVE_DELAY * 3);
        }
        callbacks.current.onSaveState("error", whiteboardErrorMessage(error));
      } finally {
        saving.current = false;
      }
    },
    async pull() {
      const api = apiRef.current;
      if (!api || pulling.current) return;
      pulling.current = true;
      try {
        const remote = await whiteboardApi.detail(board.id);
        const remoteElements = restore(remote.scene);
        const merged = reconcileElements(
          api.getSceneElementsIncludingDeleted(),
          remoteElements as RemoteExcalidrawElement[],
          api.getAppState(),
        );
        api.updateScene({
          elements: merged,
          captureUpdate: CaptureUpdateAction.NEVER,
        });
        version.current = remote.version;
        savedHash.current = hashElementsVersion(remoteElements);
        callbacks.current.onRemote(remote);
        if (hashElementsVersion(merged) !== savedHash.current) {
          callbacks.current.onSaveState("dirty");
          engine.current.schedule(0);
        } else callbacks.current.onSaveState("saved");
      } catch (error) {
        if (normalizeApiError(error).status === 404)
          callbacks.current.onGone(whiteboardErrorMessage(error));
      } finally {
        pulling.current = false;
      }
    },
    onChange(
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
    ) {
      const ids = selectedIds(appState.selectedElementIds);
      const joined = ids.join(",");
      if (joined !== selection.current) {
        selection.current = joined;
        callbacks.current.onSelection(ids);
      }
      if (!editableRef.current) return;
      const hash = hashElementsVersion(elements);
      if (hash === savedHash.current || hash === rejectedHash.current) return;
      // 커서·선택·스크롤도 onChange 를 부른다. 내용이 바뀐 때만 2초를 다시 센다(안 그러면 1초 커서 갱신이 저장을 영영 미룬다).
      if (hash === seenHash.current) return;
      seenHash.current = hash;
      callbacks.current.onSaveState("dirty");
      engine.current.schedule();
    },
  });

  // 커서 보내기 + 다른 사람 저장 알아채기. 탭이 숨겨지면 쉰다.
  useEffect(() => {
    let inflight = false;
    let stopped = false;
    const tick = async () => {
      const api = apiRef.current;
      if (!api || inflight || document.hidden) return;
      inflight = true;
      try {
        const appState = api.getAppState();
        const at =
          pointer.current ??
          viewportCoordsToSceneCoords(
            {
              clientX: appState.offsetLeft + appState.width / 2,
              clientY: appState.offsetTop + appState.height / 2,
            },
            appState,
          );
        const presence = await whiteboardApi.presence(board.id, {
          x: at.x,
          y: at.y,
          selectedElementIds: selectedIds(appState.selectedElementIds),
        });
        if (stopped) return;
        api.updateScene({
          collaborators: toCollaborators(presence.cursors) as unknown as Map<
            SocketId,
            Collaborator
          >,
          captureUpdate: CaptureUpdateAction.NEVER,
        });
        if (presence.version > version.current && !saving.current)
          await engine.current.pull();
      } catch (error) {
        // 커서는 잃어도 되는 값이다. 보드가 사라진 것만 알린다.
        if (normalizeApiError(error).status === 404) {
          stopped = true;
          callbacks.current.onGone(whiteboardErrorMessage(error));
        }
      } finally {
        inflight = false;
      }
    };
    const id = setInterval(() => void tick(), PRESENCE_INTERVAL);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [board.id]);

  // 떠날 때 저장 안 한 변경이 있으면 한 번 더 보내고, 창을 닫으려 하면 브라우저가 묻게 한다.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      const api = apiRef.current;
      if (!api || !editableRef.current) return;
      if (
        hashElementsVersion(api.getSceneElementsIncludingDeleted()) !==
        savedHash.current
      )
        event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    const current = engine.current;
    return () => {
      window.removeEventListener("beforeunload", warn);
      if (timer.current) clearTimeout(timer.current);
      void current.save();
    };
  }, []);

  return (
    <Excalidraw
      excalidrawAPI={(api) => {
        apiRef.current = api;
        onReady({
          focus(elementId) {
            const element = api
              .getSceneElements()
              .find((item) => item.id === elementId);
            if (!element) return;
            api.updateScene({
              appState: { selectedElementIds: { [elementId]: true } },
              captureUpdate: CaptureUpdateAction.NEVER,
            });
            api.scrollToContent(element, { animate: true });
          },
          restore(scene) {
            const next = restoreOnto(
              api.getSceneElementsIncludingDeleted(),
              restore(scene),
            );
            api.updateScene({
              elements: next,
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
            void engine.current.save();
          },
        });
      }}
      initialData={{
        elements: restore(board.scene),
        appState: { ...board.scene.appState, shouldCacheIgnoreZoom: false },
        scrollToContent: true,
      }}
      onChange={(elements, appState) => {
        engine.current.onChange(elements, appState);
        if (appState.shouldCacheIgnoreZoom && crispFrame.current === null) {
          crispFrame.current = requestAnimationFrame(() => {
            crispFrame.current = null;
            apiRef.current?.updateScene({
              appState: { shouldCacheIgnoreZoom: false },
              captureUpdate: CaptureUpdateAction.NEVER,
            });
          });
        }
      }}
      theme={theme}
      onPointerUpdate={({ pointer: at }) => {
        pointer.current = { x: at.x, y: at.y };
      }}
      isCollaborating
      viewModeEnabled={!editable}
      langCode="ko-KR"
      // 이미지·파일·웹 임베드는 서버가 받지 않는다(D10-6). 처음부터 고를 수 없게 한다.
      UIOptions={{
        tools: { image: false },
        canvasActions: { loadScene: false, saveToActiveFile: false },
      }}
      validateEmbeddable={false}
    />
  );
}
