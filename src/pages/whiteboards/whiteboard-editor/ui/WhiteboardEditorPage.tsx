"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
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
import { AuthGuard } from "@/features/auth";
import { routes } from "@/shared/config";
import {
  Button,
  Dialog,
  ErrorState,
  Field,
  Icon,
  Input,
  Skeleton,
  useToast,
} from "@/shared/ui";
import type { CanvasControls, SaveState } from "./Canvas";
import { CommentsPanel } from "./CommentsPanel";
import { RevisionsDialog } from "./RevisionsDialog";

// Excalidraw 는 window 를 바로 읽어 서버에서 그릴 수 없다.
const Canvas = dynamic(() => import("./Canvas"), {
  ssr: false,
  loading: () => <Skeleton className="h-full" />,
});

const saveLabels: Readonly<Record<SaveState, string>> = {
  saved: "저장됨",
  dirty: "저장 대기",
  saving: "저장 중",
  error: "저장 실패",
};

export function WhiteboardEditorPage({
  whiteboardId,
}: {
  readonly whiteboardId: string;
}) {
  return (
    <AuthGuard require="work" fallback={<WhiteboardEditorSkeleton />}>
      {() => <Editor whiteboardId={whiteboardId} />}
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
            <span className="ui-skeleton-text">댓글</span>
          </span>
          <span className="ui-button ui-button-secondary">
            <span className="ui-skeleton-text">변경 이력</span>
          </span>
        </div>
      </header>
      <div aria-hidden="true" className="whiteboard-layout">
        <div className="whiteboard-canvas" />
      </div>
    </div>
  );
}

function Editor({ whiteboardId }: { readonly whiteboardId: string }) {
  const board = useQuery(whiteboardQueries.detail(whiteboardId));
  if (board.isPending) return <WhiteboardEditorSkeleton />;
  // 캐시가 있으면 재조회 실패에도 편집기를 내리지 않는다(편집 중인 캔버스를 지우지 않게).
  if (!board.data)
    return (
      <ErrorState
        description={whiteboardErrorMessage(board.error)}
        onRetry={() => void board.refetch()}
      />
    );
  return <EditorContent key={board.data.id} initial={board.data} />;
}

function EditorContent({ initial }: { readonly initial: WhiteboardDetail }) {
  const client = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  // 캔버스는 처음 받은 scene 으로만 시작한다. 이후 머리글(제목·권한)만 최신으로 바꾼다.
  const [meta, setMeta] = useState(initial);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [gone, setGone] = useState<string | null>(null);
  const [selection, setSelection] = useState<readonly string[]>([]);
  const [panel, setPanel] = useState<"comments" | null>(null);
  const [dialog, setDialog] = useState<
    "revisions" | "rename" | "delete" | null
  >(null);
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
      toast("화이트보드를 지웠습니다.", "success");
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
          <p className="page-subtitle" aria-live="polite">
            {meta.canEdit ? saveLabels[saveState] : "보기 전용"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            aria-pressed={panel === "comments"}
            onClick={() => setPanel(panel ? null : "comments")}
          >
            댓글
          </Button>
          <Button variant="secondary" onClick={() => setDialog("revisions")}>
            변경 이력
          </Button>
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
          <Canvas
            board={initial}
            editable={meta.canEdit}
            onReady={(value) => {
              controls.current = value;
            }}
            onSaveState={(state, message) => {
              setSaveState(state);
              // 같은 이유의 실패를 2초마다 띄우지 않는다.
              if (state === "error" && message && message !== lastError.current)
                toast(message, "error");
              lastError.current = state === "error" ? (message ?? null) : null;
            }}
            onSelection={setSelection}
            onRemote={(remote) => {
              setMeta(remote);
              client.setQueryData(whiteboardKeys.detail(remote.id), remote);
            }}
            onGone={setGone}
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
            "이 이력으로 되돌렸습니다. 되돌린 것도 이력에 남습니다.",
            "success",
          );
        }}
      />
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
          「{meta.title}」와 변경 이력, 댓글이 모두 지워집니다. 되돌릴 수
          없습니다.
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
      return setError(`제목은 ${WHITEBOARD_TITLE_MAX}자까지 쓸 수 있습니다.`);
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
