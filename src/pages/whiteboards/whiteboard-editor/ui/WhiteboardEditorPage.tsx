"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectQueries } from "@/entities/project";
import {
  WHITEBOARD_TITLE_MAX,
  whiteboardApi,
  whiteboardErrorMessage,
  whiteboardKeys,
  whiteboardQueries,
  type WhiteboardDetail,
} from "@/entities/whiteboard";
import { isHeadAdmin, type User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { TemplateFormDialog } from "@/features/manage-whiteboard-template";
import { routes } from "@/shared/config";
import { localExcalidrawAssets } from "@/shared/lib";
import {
  Avatar,
  Button,
  Dialog,
  ErrorState,
  Field,
  Icon,
  IconButton,
  Input,
  Skeleton,
  StaleNotice,
  useToast,
} from "@/shared/ui";
import { normalizeApiError } from "@/shared/api";
import type { CanvasControls, RealtimeView, SaveState } from "./Canvas";
import type { RealtimeOffReason, RealtimeStatus } from "../model/realtime";
import { dismissStartGuide, startGuideDismissed } from "../model/guide";
import { CommentsPanel } from "./CommentsPanel";
import { ShortcutsDialog, StartGuide } from "./Guide";
import { LinksPanel } from "./LinksPanel";
import { RevisionsDialog } from "./RevisionsDialog";
import { TemplateInsertDialog } from "./TemplateInsertDialog";

// Excalidraw 는 window 를 바로 읽어 서버에서 그릴 수 없다.
// 청크를 부르기 전에 글꼴 주소를 같은 출처로 정한다(esm.sh 를 부르지 않는다).
const Canvas = dynamic(() => (localExcalidrawAssets(), import("./Canvas")), {
  ssr: false,
  loading: () => <Skeleton className="h-full" />,
});
// Mermaid 변환기는 편집기보다도 무겁다. 대화상자를 처음 열 때 받는다.
const MermaidDialog = dynamic(
  () => (localExcalidrawAssets(), import("./MermaidDialog")),
  { ssr: false },
);

const noSubscribe = () => () => {};

const saveLabels: Readonly<Record<SaveState, string>> = {
  saved: "저장됨",
  dirty: "저장 대기",
  saving: "저장 중",
  error: "저장 실패",
};

// 색만으로 구분하지 않게 늘 글자로 쓴다.
const realtimeLabels: Readonly<Record<RealtimeStatus, string>> = {
  connecting: "실시간 연결 중",
  live: "실시간 연결됨",
  reconnecting: "다시 연결 중",
  off: "실시간 꺼짐",
};

/** 실시간이 꺼진 이유. 꺼져도 저장과 커서는 폴링으로 계속된다. */
const offMessages: Readonly<Partial<Record<RealtimeOffReason, string>>> = {
  denied:
    "이 화이트보드를 볼 권한이 없어 실시간으로 연결하지 못했어요. 상태를 다시 확인해요.",
  revoked:
    "이 화이트보드에 대한 권한이 바뀌어 실시간 연결을 끊었어요. 상태를 다시 확인해요.",
  full: "동시에 편집하는 사람이 많아 실시간 연결 없이 계속해요. 변경은 그대로 저장돼요.",
};

const PRESENCE_AVATARS = 5;

export function WhiteboardEditorPage({
  whiteboardId,
}: {
  readonly whiteboardId: string;
}) {
  return (
    <AuthGuard require="work" fallback={<WhiteboardEditorSkeleton />}>
      {(user) => <Editor whiteboardId={whiteboardId} user={user} />}
    </AuthGuard>
  );
}

/** 머리글(경로, 제목, 저장 상태, 버튼)과 고정 높이 캔버스 자리. 편집기로 바뀌어도 머리글과 캔버스 높이가 그대로다. */
export function WhiteboardEditorSkeleton() {
  return (
    <div
      role="status"
      aria-label="화이트보드 불러오는 중"
      className="whiteboard-page grid min-w-0 gap-3"
    >
      <header aria-hidden="true" className="page-header">
        <div className="min-w-0">
          <p className="board-breadcrumb">
            <span className="ui-skeleton-text">프로젝트 / 화이트보드</span>
          </p>
          <h1 className="truncate">
            <span className="ui-skeleton-text">화이트보드 불러오는 중</span>
          </h1>
          <p className="page-subtitle">
            <span className="ui-skeleton-text">저장됨</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="ui-button ui-button-secondary">
            <span className="ui-skeleton-text">Mermaid로 그리기</span>
          </span>
          <span className="ui-button ui-button-secondary">
            <span className="ui-skeleton-text">댓글</span>
          </span>
          <span className="ui-button ui-button-secondary">
            <span className="ui-skeleton-text">연결</span>
          </span>
          <span className="ui-button ui-button-secondary">
            <span className="ui-skeleton-text">변경 이력</span>
          </span>
          <span className="ui-button ui-button-ghost ui-icon-button">
            <span className="ui-skeleton-text">?</span>
          </span>
          <span className="ui-button ui-button-ghost">
            <span className="ui-skeleton-text">이름 바꾸기</span>
          </span>
          <span className="ui-button ui-button-ghost">
            <span className="ui-skeleton-text">X 지우기</span>
          </span>
        </div>
      </header>
      <div aria-hidden="true" className="whiteboard-layout">
        <div className="whiteboard-canvas" />
      </div>
    </div>
  );
}

function Editor({
  whiteboardId,
  user,
}: {
  readonly whiteboardId: string;
  readonly user: User;
}) {
  const board = useQuery(whiteboardQueries.detail(whiteboardId));
  if (board.isPending) return <WhiteboardEditorSkeleton />;
  // 5xx·네트워크 실패는 편집기를 두고 위에 안내만 띄운다. 403·404(권한 잃음, 삭제)는 편집기를 내린다.
  const lost =
    board.isError && [403, 404].includes(normalizeApiError(board.error).status);
  if (!board.data || lost)
    return (
      <ErrorState
        description={whiteboardErrorMessage(board.error)}
        onRetry={() => void board.refetch()}
      />
    );
  return (
    <>
      <StaleNotice query={board} />
      <EditorContent key={board.data.id} initial={board.data} user={user} />
    </>
  );
}

function EditorContent({
  initial,
  user,
}: {
  readonly initial: WhiteboardDetail;
  readonly user: User;
}) {
  const client = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  // 캔버스는 처음 받은 scene 으로만 시작한다. 이후 머리글(제목·권한)만 최신으로 바꾼다.
  const [meta, setMeta] = useState(initial);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [realtime, setRealtime] = useState<RealtimeView>({
    status: "connecting",
    participants: [],
  });
  // 같은 사람이 탭 두 개로 들어와도 얼굴은 하나다.
  const people = [
    ...new Map(
      realtime.participants.map((person) => [person.user.id, person.user]),
    ).values(),
  ];
  const [gone, setGone] = useState<string | null>(null);
  const [selection, setSelection] = useState<readonly string[]>([]);
  const [panel, setPanel] = useState<"comments" | "links" | null>(null);
  const [dialog, setDialog] = useState<
    | "revisions"
    | "rename"
    | "delete"
    | "mermaid"
    | "template"
    | "shortcuts"
    | "save-template"
    | null
  >(null);
  // 빈 보드 시작 안내: 처음 편집하면 닫히고, 사용자마다 한 번 닫으면 다시 뜨지 않는다.
  // 서버 그림에는 띄우지 않고(저장소를 읽을 수 없다) 브라우저에서 읽는다. 캔버스 위에 떠 있어 자리가 밀리지 않는다.
  const guideRemembered = useSyncExternalStore(
    noSubscribe,
    () => startGuideDismissed(user.id),
    () => true,
  );
  const [guideClosed, setGuideClosed] = useState(
    () =>
      !initial.scene.elements.every(
        (element) => (element as { isDeleted?: boolean }).isDeleted,
      ),
  );
  const showGuide = meta.canEdit && !guideRemembered && !guideClosed;
  const closeGuide = () => {
    dismissStartGuide(user.id);
    setGuideClosed(true);
  };
  const controls = useRef<CanvasControls | null>(null);
  const lastError = useRef<string | null>(null);
  const project = useQuery({
    ...projectQueries.detail(meta.projectId ?? ""),
    enabled: !!meta.projectId,
  });
  const listHref = meta.projectId
    ? routes.projectWhiteboards(meta.projectId)
    : routes.whiteboards;
  const remove = useMutation({
    mutationFn: () => whiteboardApi.remove(meta.id),
    onSuccess: async () => {
      client.removeQueries({ queryKey: whiteboardKeys.detail(meta.id) });
      await client.invalidateQueries({ queryKey: whiteboardKeys.all });
      toast("화이트보드를 지웠어요.", "success");
      router.push(listHref);
    },
    onError: (error) => toast(whiteboardErrorMessage(error), "error"),
  });

  if (gone)
    return (
      <ErrorState description={gone} onRetry={() => router.push(listHref)} />
    );

  return (
    <div className="whiteboard-page grid min-w-0 gap-3">
      <header className="page-header">
        <div className="min-w-0">
          <p className="board-breadcrumb flex-wrap">
            {meta.projectId ? (
              <>
                <Link href={routes.project(meta.projectId)}>
                  {project.data?.key ?? "프로젝트"}
                </Link>
                <span aria-hidden="true">/</span>
                <Link href={listHref}>화이트보드</Link>
              </>
            ) : (
              <Link href={listHref}>팀 공용 화이트보드</Link>
            )}
          </p>
          <h1 className="truncate">{meta.title}</h1>
          <p className="page-subtitle whiteboard-status">
            <span aria-live="polite">
              {meta.canEdit ? saveLabels[saveState] : "보기 전용"}
            </span>
            <span
              className="whiteboard-realtime"
              data-status={realtime.status}
              role="status"
            >
              {realtimeLabels[realtime.status]}
            </span>
            {realtime.status === "live" && people.length > 0 && (
              <span
                className="whiteboard-presence"
                aria-label={`함께 보는 사람 ${people.length}명`}
              >
                {people.slice(0, PRESENCE_AVATARS).map((person) => (
                  <Avatar
                    key={person.id}
                    name={person.name}
                    src={person.avatarUrl ?? undefined}
                  />
                ))}
                {people.length > PRESENCE_AVATARS && (
                  <span>+{people.length - PRESENCE_AVATARS}</span>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {meta.canEdit && (
            <Button variant="secondary" onClick={() => setDialog("mermaid")}>
              Mermaid로 그리기
            </Button>
          )}
          <Button
            variant="secondary"
            aria-pressed={panel === "comments"}
            onClick={() => setPanel(panel === "comments" ? null : "comments")}
          >
            댓글
          </Button>
          <Button
            variant="secondary"
            aria-pressed={panel === "links"}
            onClick={() => setPanel(panel === "links" ? null : "links")}
          >
            연결
          </Button>
          <Button variant="secondary" onClick={() => setDialog("revisions")}>
            변경 이력
          </Button>
          <IconButton
            aria-label="단축키"
            variant="ghost"
            onClick={() => setDialog("shortcuts")}
          >
            <Icon name="help" />
          </IconButton>
          {isHeadAdmin(user) && (
            <Button variant="ghost" onClick={() => setDialog("save-template")}>
              팀 템플릿으로 저장
            </Button>
          )}
          {meta.canEdit && (
            <Button variant="ghost" onClick={() => setDialog("rename")}>
              이름 바꾸기
            </Button>
          )}
          {meta.canDelete && (
            <Button variant="ghost" onClick={() => setDialog("delete")}>
              <Icon name="close" className="inline-block" /> 지우기
            </Button>
          )}
        </div>
      </header>
      <div className="whiteboard-layout" data-panel={panel ?? undefined}>
        <div className="whiteboard-canvas">
          {showGuide && (
            <StartGuide
              onTemplate={() => setDialog("template")}
              onMermaid={() => setDialog("mermaid")}
              onClose={closeGuide}
            />
          )}
          <Canvas
            board={initial}
            editable={meta.canEdit}
            onReady={(value) => {
              controls.current = value;
            }}
            onSaveState={(state, message) => {
              setSaveState(state);
              if (state === "dirty" && showGuide) closeGuide();
              // 같은 이유의 실패를 2초마다 띄우지 않는다.
              if (state === "error" && message && message !== lastError.current)
                toast(message, "error");
              lastError.current = state === "error" ? (message ?? null) : null;
            }}
            onSelection={setSelection}
            onRemote={(remote) => {
              setMeta(remote);
              // 다른 사람이 먼저 그렸다. 이번 화면에서만 안내를 내린다.
              if (remote.scene.elements.length > 0) setGuideClosed(true);
              client.setQueryData(whiteboardKeys.detail(remote.id), remote);
            }}
            onGone={setGone}
            onRealtime={(view) => {
              setRealtime(view);
              const message = view.reason && offMessages[view.reason];
              if (view.status === "off" && message) toast(message, "info");
            }}
            onAccess={(canEdit) =>
              setMeta((current) =>
                current.canEdit === canEdit ? current : { ...current, canEdit },
              )
            }
          />
        </div>
        {panel === "comments" && (
          <CommentsPanel
            whiteboardId={meta.id}
            canEdit={meta.canEdit}
            selection={selection}
            onFocus={(elementId) => controls.current?.focus(elementId)}
            onClose={() => setPanel(null)}
          />
        )}
        {panel === "links" && (
          <LinksPanel
            whiteboardId={meta.id}
            canEdit={meta.canEdit}
            onClose={() => setPanel(null)}
          />
        )}
      </div>
      <RevisionsDialog
        open={dialog === "revisions"}
        whiteboardId={meta.id}
        canEdit={meta.canEdit}
        onClose={() => setDialog(null)}
        onRestore={(scene) => {
          controls.current?.restore(scene);
          setDialog(null);
          toast(
            "이 이력으로 되돌렸어요. 되돌린 것도 이력에 남아요.",
            "success",
          );
        }}
      />
      {dialog === "mermaid" && (
        <MermaidDialog
          onClose={() => setDialog(null)}
          onInsert={(elements) => controls.current?.insert(elements)}
        />
      )}
      <TemplateInsertDialog
        open={dialog === "template"}
        onClose={() => setDialog(null)}
        onInsert={(template) =>
          controls.current?.insert(template.scene.elements)
        }
      />
      <ShortcutsDialog
        open={dialog === "shortcuts"}
        onClose={() => setDialog(null)}
      />
      {isHeadAdmin(user) && (
        <TemplateFormDialog
          open={dialog === "save-template"}
          mode={{
            kind: "create",
            whiteboardId: meta.id,
            blocked:
              saveState === "saved"
                ? undefined
                : "저장하지 않은 변경이 있어요. 머리글이 저장됨으로 바뀐 뒤 저장하세요.",
          }}
          onClose={() => setDialog(null)}
        />
      )}
      <RenameDialog
        open={dialog === "rename"}
        board={meta}
        onClose={() => setDialog(null)}
        onSaved={(title) => {
          setMeta((current) => ({ ...current, title }));
          setDialog(null);
        }}
      />
      <Dialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        title="화이트보드 지우기"
      >
        <p className="text-sm">
          「{meta.title}」와 변경 이력, 댓글이 모두 지워져요. 되돌릴 수 없어요.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDialog(null)}>
            취소
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() => remove.mutate()}
          >
            지우기
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function RenameDialog({
  open,
  board,
  onClose,
  onSaved,
}: {
  readonly open: boolean;
  readonly board: WhiteboardDetail;
  readonly onClose: () => void;
  readonly onSaved: (title: string) => void;
}) {
  const client = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState(board.title);
  const [error, setError] = useState<string>();
  const rename = useMutation({
    mutationFn: (value: string) => whiteboardApi.rename(board.id, value),
    onSuccess: async (saved) => {
      await client.invalidateQueries({ queryKey: whiteboardKeys.all });
      onSaved(saved.title);
    },
    onError: (failure) => toast(whiteboardErrorMessage(failure), "error"),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return setError("제목을 입력하세요.");
    if (value.length > WHITEBOARD_TITLE_MAX)
      return setError(`제목은 ${WHITEBOARD_TITLE_MAX}자까지 쓸 수 있어요.`);
    setError(undefined);
    rename.mutate(value);
  }
  return (
    <Dialog open={open} onClose={onClose} title="이름 바꾸기">
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <Field id="whiteboard-rename" label="제목" error={error}>
          <Input
            id="whiteboard-rename"
            value={title}
            maxLength={WHITEBOARD_TITLE_MAX}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "whiteboard-rename-error" : undefined}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" variant="primary" loading={rename.isPending}>
            저장
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
