"use client";

import "@excalidraw/excalidraw/index.css";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  CaptureUpdateAction,
  Excalidraw,
  getCommonBounds,
  hashElementsVersion,
  loadLibraryFromBlob,
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
  realtimeSocketUrl,
  whiteboardApi,
  whiteboardErrorMessage,
  type WhiteboardCursor,
  type WhiteboardDetail,
  type WhiteboardRealtimeParticipant,
  type WhiteboardScene,
  type WhiteboardServerMessage,
} from "@/entities/whiteboard";
import { readTheme, subscribeTheme } from "@/shared/lib";
import { ApiError, normalizeApiError } from "@/shared/api";
import {
  prepareInsert,
  restoreOnto,
  selectedIds,
  sharedAppState,
  toCollaborators,
} from "../model/scene";
import {
  createRealtimeConnection,
  type RealtimeConnection,
  type RealtimeOffReason,
  type RealtimeStatus,
  type SocketLike,
} from "../model/realtime";
import {
  createLiveSession,
  rejectsElements,
  type LiveSession,
} from "../model/live-session";

export type SaveState = "saved" | "dirty" | "saving" | "error";

export type CanvasControls = {
  /** 요소를 골라 화면 가운데로 옮긴다(댓글에서 요소로 가기). */
  readonly focus: (elementId: string) => void;
  /** 이력의 scene 으로 바꾸고 곧바로 저장한다. */
  readonly restore: (scene: WhiteboardScene) => void;
  /** 요소를 새 id 로 복제해 화면 가운데 넣고 고른다(템플릿, Mermaid). 저장은 평소처럼 2초 뒤. */
  readonly insert: (elements: readonly unknown[]) => void;
};

/** 내장 도형 라이브러리. 같은 출처의 정적 파일이라 excalidraw.com 등 바깥을 부르지 않는다. 편집기를 열 때만 받는다. */
const LIBRARY_URL = "/whiteboard/architecture.excalidrawlib";
const loadLibrary = () =>
  fetch(LIBRARY_URL)
    .then((response) => (response.ok ? response.blob() : Promise.reject()))
    .then((blob) => loadLibraryFromBlob(blob, "published"))
    // 라이브러리는 덤이다. 못 받아도 그리기는 된다.
    .catch(() => []);

const SAVE_DELAY = 2_000;
const PRESENCE_INTERVAL = 1_000;
/** s19 권장 주기: elements 100ms 디바운스, pointer 50ms 이하. */
const SEND_DELAY = 100;
const POINTER_INTERVAL = 50;
/** 폴링 사용자(connectionId null)의 커서는 이만큼 소식이 없으면 내린다. */
const CURSOR_TTL = 15_000;

export type RealtimeView = {
  readonly status: RealtimeStatus;
  readonly reason?: RealtimeOffReason;
  readonly participants: readonly WhiteboardRealtimeParticipant[];
};

type RemoteCursor = {
  readonly connectionId: string | null;
  readonly userId: string;
  readonly x: number;
  readonly y: number;
  readonly selectedElementIds: readonly string[];
  readonly at: number;
};

type Props = {
  readonly board: WhiteboardDetail;
  readonly editable: boolean;
  readonly onReady: (controls: CanvasControls) => void;
  readonly onSaveState: (state: SaveState, message?: string) => void;
  readonly onSelection: (ids: readonly string[]) => void;
  /** 다른 사람의 저장을 받아 왔을 때(제목·권한도 바뀌었을 수 있다). */
  readonly onRemote: (board: WhiteboardDetail) => void;
  readonly onGone: (message: string) => void;
  /** 실시간 연결 상태와 참여자. */
  readonly onRealtime: (view: RealtimeView) => void;
  /** 소켓이 알려 준 편집 권한(joined, access). */
  readonly onAccess: (canEdit: boolean) => void;
};

const restore = (scene: WhiteboardScene) =>
  restoreElements(
    scene.elements as readonly ExcalidrawElement[],
    null,
  ) as OrderedExcalidrawElement[];

/**
 * Excalidraw 와 서버를 잇는다(D10-5, D10-12, s19).
 * - 실시간(WebSocket)으로 붙으면 바뀐 요소만 보내고 받은 요소를 reconcileElements 로 합친다. 저장은 서버가 한다.
 * - 붙지 못하거나 끊긴 동안은 아래 폴링과 REST 저장으로 계속한다.
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
  onRealtime,
  onAccess,
}: Props) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  // 처음 그릴 때 한 번만 받는다(initialData 는 렌더마다 새로 만들어진다).
  const [library] = useState(loadLibrary);
  const theme = useSyncExternalStore<"light" | "dark">(
    subscribeTheme,
    readTheme,
    () => "light",
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
  const callbacks = useRef({
    onSaveState,
    onSelection,
    onRemote,
    onGone,
    onRealtime,
    onAccess,
  });
  const editableRef = useRef(editable);
  useEffect(() => {
    callbacks.current = {
      onSaveState,
      onSelection,
      onRemote,
      onGone,
      onRealtime,
      onAccess,
    };
    editableRef.current = editable;
  });
  // 실시간 상태. live 인 동안 폴링과 REST 자동 저장을 멈춘다.
  const realtime = useRef<RealtimeConnection | null>(null);
  const live = useRef(false);
  const me = useRef<string | null>(null);
  const participants = useRef(new Map<string, WhiteboardRealtimeParticipant>());
  const cursors = useRef(new Map<string, RemoteCursor>());
  /** 1009 안내는 한 번만. */
  const toldTooLarge = useRef(false);
  const sendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerSentAt = useRef(0);

  // 소켓 동기화(model/live-session). 연결과 함께 아래 effect 에서 만든다.
  const liveSync = useRef<LiveSession<OrderedExcalidrawElement> | null>(null);

  const engine = useRef({
    schedule(delay = SAVE_DELAY) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void engine.current.save(), delay);
    },
    async save() {
      const api = apiRef.current;
      if (!api || !editableRef.current) return;
      if (live.current) {
        engine.current.flush();
        // 소켓이 거부한 변경(1009 등)이 남았으면 REST 로 보낸다. 방이 열려 있으면 서버가 방에 병합한다(D19-10).
        if (liveSync.current?.settled() ?? true) return;
      }
      if (saving.current || pulling.current) return engine.current.schedule();
      const elements = api.getSceneElementsIncludingDeleted();
      const hash = hashElementsVersion(elements);
      if (hash === savedHash.current)
        return callbacks.current.onSaveState("saved");
      saving.current = true;
      callbacks.current.onSaveState("saving");
      try {
        // 지운 요소(isDeleted)도 함께 보낸다(s19 5절). 빼면 다른 화면이 병합하며 되살리고, 방이 열려 있으면 서버가
        // baseVersion 이후 안 바뀐 요소만 지운 것으로 본다(D19-10). 24시간 지난 지운 요소는 서버가 정리한다(D19-14).
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
      if (live.current) {
        if (liveSync.current?.changed()) {
          callbacks.current.onSaveState("dirty");
          if (!sendTimer.current)
            sendTimer.current = setTimeout(() => {
              sendTimer.current = null;
              engine.current.flush();
            }, SEND_DELAY);
        }
        return;
      }
      const hash = hashElementsVersion(elements);
      if (hash === savedHash.current || hash === rejectedHash.current) return;
      // 커서·선택·스크롤도 onChange 를 부른다. 내용이 바뀐 때만 2초를 다시 센다(안 그러면 1초 커서 갱신이 저장을 영영 미룬다).
      if (hash === seenHash.current) return;
      seenHash.current = hash;
      callbacks.current.onSaveState("dirty");
      engine.current.schedule();
    },
    /** 서버가 모르는 내 변경만 소켓으로 보낸다. */
    flush() {
      const api = apiRef.current;
      if (!api || !live.current || !editableRef.current) return;
      if (sendTimer.current) clearTimeout(sendTimer.current);
      sendTimer.current = null;
      liveSync.current?.flush();
    },
    /** 소켓의 다른 사람 커서를 그린다. 이름은 참여자 목록에서 찾는다(폴링 사용자는 이름을 모른다). */
    drawCursors() {
      const api = apiRef.current;
      if (!api) return;
      const people = [...participants.current.values()];
      const list: WhiteboardCursor[] = [...cursors.current.values()].map(
        (cursor) => ({
          user: people.find((person) => person.user.id === cursor.userId)
            ?.user ?? {
            id: cursor.userId,
            username: "",
            name: "참여자",
            avatarUrl: null,
          },
          x: cursor.x,
          y: cursor.y,
          selectedElementIds: cursor.selectedElementIds,
          updatedAt: new Date(cursor.at).toISOString(),
        }),
      );
      api.updateScene({
        collaborators: toCollaborators(list) as unknown as Map<
          SocketId,
          Collaborator
        >,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    },
    report(status: RealtimeStatus, reason?: RealtimeOffReason) {
      callbacks.current.onRealtime({
        status,
        reason,
        participants: [...participants.current.values()],
      });
    },
    /** 지금 화면이 서버가 아는 것과 같으면 저장됨으로 둔다. */
    settle() {
      const api = apiRef.current;
      if (!api || !liveSync.current?.settled()) return false;
      savedHash.current = hashElementsVersion(
        api.getSceneElementsIncludingDeleted(),
      );
      callbacks.current.onSaveState("saved");
      return true;
    },
    receive(message: WhiteboardServerMessage) {
      const api = apiRef.current;
      if (!api) return;
      switch (message.type) {
        case "joined": {
          me.current = message.connectionId;
          participants.current = new Map(
            message.participants.map((person) => [person.connectionId, person]),
          );
          cursors.current.clear();
          live.current = true;
          // 폴링 저장을 멈춘다. 끊긴 동안의 내 변경은 아래 flush 가 보낸다.
          if (timer.current) clearTimeout(timer.current);
          version.current = message.version;
          callbacks.current.onAccess(message.canEdit);
          editableRef.current = message.canEdit;
          if (sendTimer.current) clearTimeout(sendTimer.current);
          sendTimer.current = null;
          // 읽기 전용이면 합치기만 하고 보내지 않는다(port.send 가 막는다).
          liveSync.current?.joined(
            restore(message.scene),
            message.scene.appState,
          );
          engine.current.drawCursors();
          engine.current.settle();
          return engine.current.report("live");
        }
        case "participant-joined":
          participants.current.set(
            message.participant.connectionId,
            message.participant,
          );
          return engine.current.report("live");
        case "participant-left":
          participants.current.delete(message.connectionId);
          for (const [userId, cursor] of cursors.current)
            if (cursor.connectionId === message.connectionId)
              cursors.current.delete(userId);
          engine.current.drawCursors();
          return engine.current.report("live");
        case "elements": {
          if (message.connectionId && message.connectionId === me.current)
            return;
          return liveSync.current?.incoming(
            restore({ elements: message.elements }),
            message.appState,
          );
        }
        case "pointer": {
          if (message.connectionId && message.connectionId === me.current)
            return;
          cursors.current.set(message.userId, {
            connectionId: message.connectionId,
            userId: message.userId,
            x: message.x,
            y: message.y,
            selectedElementIds: message.selectedElementIds ?? [],
            at: Date.now(),
          });
          return engine.current.drawCursors();
        }
        case "saved":
          version.current = message.version;
          realtime.current?.healthy();
          engine.current.settle();
          return;
        case "scene":
          liveSync.current?.replace(
            restore(message.scene),
            message.scene.appState,
          );
          version.current = message.version;
          engine.current.settle();
          return;
        case "access":
          editableRef.current = message.canEdit;
          return callbacks.current.onAccess(message.canEdit);
        case "error":
          // 그 묶음은 하나도 반영되지 않았다. 다시 보내지 않고, 화면에 남아 있는 동안 저장됨으로 두지 않는다.
          if (rejectsElements(message.code)) liveSync.current?.reject();
          return callbacks.current.onSaveState(
            "error",
            whiteboardErrorMessage(
              new ApiError(0, message.code, message.message, message.details),
            ),
          );
        case "pong":
          return;
      }
    },
    onStatus(status: RealtimeStatus, reason?: RealtimeOffReason) {
      const wasLive = live.current;
      live.current = status === "live";
      if (!live.current) {
        if (sendTimer.current) clearTimeout(sendTimer.current);
        sendTimer.current = null;
        participants.current.clear();
        cursors.current.clear();
        me.current = null;
      }
      engine.current.report(status, reason);
      // 볼 권한이 없거나(denied) 잃었다(revoked). 보드 상태를 다시 본다(404 면 onGone).
      if (reason === "denied" || reason === "revoked")
        void engine.current.pull();
      if (!wasLive || live.current) return;
      // 보낸 묶음이 너무 커서 닫혔다(1009). 소켓으로 되풀이하지 않고 REST 저장으로 보낸다.
      if (
        reason === "too-large" &&
        (liveSync.current?.reject() ?? 0) > 0 &&
        !toldTooLarge.current
      ) {
        toldTooLarge.current = true;
        callbacks.current.onSaveState(
          "error",
          "변경이 커서 실시간으로 보내지 못했습니다. 일반 저장으로 보냅니다.",
        );
      }
      // 폴링으로 떨어졌다. 보내지 못한 변경은 REST 로 저장한다(baseVersion 은 마지막 saved/joined version).
      engine.current.drawCursors();
      const api = apiRef.current;
      if (
        api &&
        editableRef.current &&
        hashElementsVersion(api.getSceneElementsIncludingDeleted()) !==
          savedHash.current
      ) {
        callbacks.current.onSaveState("dirty");
        engine.current.schedule(0);
      }
    },
  });

  // 커서 보내기 + 다른 사람 저장 알아채기. 탭이 숨겨지면 쉰다.
  useEffect(() => {
    let inflight = false;
    let stopped = false;
    const tick = async () => {
      const api = apiRef.current;
      if (!api || inflight || document.hidden || live.current) return;
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
        if (stopped || live.current) return;
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

  // 실시간 연결(s19). 붙지 못하면 위 폴링이 그대로 일한다.
  useEffect(() => {
    const connection = createRealtimeConnection({
      connectUrl: async () =>
        realtimeSocketUrl((await whiteboardApi.realtimeTicket(board.id)).path),
      createSocket: (url) => new WebSocket(url) as unknown as SocketLike,
      onMessage: (message) => engine.current.receive(message),
      onStatus: (status, reason) => engine.current.onStatus(status, reason),
    });
    realtime.current = connection;
    liveSync.current = createLiveSession<OrderedExcalidrawElement>({
      elements: () => apiRef.current?.getSceneElementsIncludingDeleted() ?? [],
      appState: () =>
        sharedAppState(
          (apiRef.current?.getAppState() ?? {}) as unknown as Record<
            string,
            unknown
          >,
        ),
      merge: (remote) => {
        const api = apiRef.current;
        if (!api) return;
        // reconcileElements 는 내가 그리고 늘이고 글을 쓰는 중인 요소를 지키고 선택도 건드리지 않는다.
        api.updateScene({
          elements: reconcileElements(
            api.getSceneElementsIncludingDeleted(),
            remote as RemoteExcalidrawElement[],
            api.getAppState(),
          ),
          captureUpdate: CaptureUpdateAction.NEVER,
        });
      },
      replace: (elements) =>
        apiRef.current?.updateScene({
          elements,
          captureUpdate: CaptureUpdateAction.NEVER,
        }),
      applyAppState: (shared) =>
        apiRef.current?.updateScene({
          appState: shared as unknown as AppState,
          captureUpdate: CaptureUpdateAction.NEVER,
        }),
      send: (message) =>
        editableRef.current && !!realtime.current?.send(message),
    });
    if (apiRef.current) connection.start();
    // 폴링 사용자 커서는 떠나도 알려 주지 않는다. 오래된 것을 내린다.
    const prune = setInterval(() => {
      if (!live.current) return;
      let changed = false;
      for (const [userId, cursor] of cursors.current)
        if (!cursor.connectionId && Date.now() - cursor.at > CURSOR_TTL) {
          cursors.current.delete(userId);
          changed = true;
        }
      if (changed) engine.current.drawCursors();
    }, CURSOR_TTL / 3);
    const current = engine.current;
    return () => {
      clearInterval(prune);
      // 소켓으로 보낸 것은 서버가 마지막 퇴장 때 저장한다. 다 보냈으면 아래 REST 저장을 건너뛴다(겹쳐 저장, 409 방지).
      if (live.current) {
        current.flush();
        current.settle();
      }
      connection.stop();
      realtime.current = null;
      live.current = false;
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
        realtime.current?.start();
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
          insert(elements) {
            const source = restore({ elements }).filter(
              (element) => !element.isDeleted,
            );
            if (source.length === 0) return;
            // 지금 보이는 화면 가운데에 넣는다.
            const appState = api.getAppState();
            const center = viewportCoordsToSceneCoords(
              {
                clientX: appState.offsetLeft + appState.width / 2,
                clientY: appState.offsetTop + appState.height / 2,
              },
              appState,
            );
            const [minX, minY, maxX, maxY] = getCommonBounds(source);
            const added = restore({
              elements: prepareInsert(
                source,
                center.x - (minX + maxX) / 2,
                center.y - (minY + maxY) / 2,
              ),
            });
            api.updateScene({
              elements: [...api.getSceneElementsIncludingDeleted(), ...added],
              appState: {
                selectedElementIds: Object.fromEntries(
                  added.map((element) => [element.id, true] as const),
                ),
              },
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
            api.scrollToContent(added, { fitToContent: true, animate: true });
          },
        });
      }}
      initialData={{
        elements: restore(board.scene),
        libraryItems: library,
        appState: { ...board.scene.appState, shouldCacheIgnoreZoom: false },
        scrollToContent: true,
      }}
      onChange={(elements, appState) => {
        engine.current.onChange(elements, appState);
      }}
      theme={theme}
      onPointerUpdate={({ pointer: at }) => {
        pointer.current = { x: at.x, y: at.y };
        const connection = realtime.current;
        if (!connection) return;
        connection.wake();
        // ponytail: 앞쪽만 거르는 throttle 이라 멈춘 자리의 마지막 50ms 는 빠질 수 있다. 끝 위치가 중요해지면 trailing 전송을 더한다.
        const now = Date.now();
        if (now - pointerSentAt.current < POINTER_INTERVAL) return;
        const appState = apiRef.current?.getAppState();
        if (
          connection.send({
            type: "pointer",
            x: at.x,
            y: at.y,
            selectedElementIds: appState
              ? selectedIds(appState.selectedElementIds)
              : [],
          })
        )
          pointerSentAt.current = now;
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
