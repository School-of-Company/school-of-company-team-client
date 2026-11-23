"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  WHITEBOARD_COMMENT_MAX,
  whiteboardApi,
  whiteboardErrorMessage,
  whiteboardKeys,
  whiteboardQueries,
  type WhiteboardComment,
} from "@/entities/whiteboard";
import { formatDate } from "@/shared/lib";
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  Skeleton,
  Textarea,
  useToast,
} from "@/shared/ui";

/** 댓글(D10-13). 요소를 하나 고른 채로 쓰면 그 요소에 단다. 본문 수정은 없다(지우고 다시 쓴다). */
export function CommentsPanel({
  whiteboardId,
  canEdit,
  selection,
  onFocus,
  onClose,
}: {
  readonly whiteboardId: string;
  readonly canEdit: boolean;
  readonly selection: readonly string[];
  readonly onFocus: (elementId: string) => void;
  readonly onClose: () => void;
}) {
  const client = useQueryClient();
  const toast = useToast();
  const comments = useQuery(whiteboardQueries.comments(whiteboardId));
  const [body, setBody] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const target = selection.length === 1 ? selection[0] : undefined;
  const refresh = () =>
    client.invalidateQueries({
      queryKey: whiteboardKeys.comments(whiteboardId),
    });
  const onError = (error: unknown) =>
    toast(whiteboardErrorMessage(error), "error");
  const add = useMutation({
    mutationFn: () =>
      whiteboardApi.addComment(whiteboardId, {
        body: body.trim(),
        ...(target ? { elementId: target } : {}),
      }),
    onSuccess: async () => {
      setBody("");
      await refresh();
    },
    onError,
  });
  const resolve = useMutation({
    mutationFn: (comment: WhiteboardComment) =>
      whiteboardApi.resolveComment(whiteboardId, comment.id, !comment.resolved),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: (comment: WhiteboardComment) =>
      whiteboardApi.removeComment(whiteboardId, comment.id),
    onSuccess: refresh,
    onError,
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    add.mutate();
  }
  const open = comments.data?.filter((comment) => !comment.resolved) ?? [];
  const resolved = comments.data?.filter((comment) => comment.resolved) ?? [];
  return (
    <aside
      className="whiteboard-panel grid content-start gap-3"
      aria-label="댓글"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">댓글</h2>
        <IconButton aria-label="댓글 닫기" variant="ghost" onClick={onClose}>
          <Icon name="close" />
        </IconButton>
      </div>
      {canEdit && (
        <form onSubmit={submit} className="grid gap-2">
          <label htmlFor="whiteboard-comment" className="sr-only">
            댓글
          </label>
          <Textarea
            id="whiteboard-comment"
            value={body}
            maxLength={WHITEBOARD_COMMENT_MAX}
            placeholder={target ? "고른 요소에 댓글 달기" : "보드에 댓글 달기"}
            onChange={(event) => setBody(event.target.value)}
            aria-describedby="whiteboard-comment-hint"
          />
          <p id="whiteboard-comment-hint" className="text-sm text-muted">
            {target
              ? "고른 요소에 답니다."
              : "요소를 하나 고르면 그 요소에 답니다."}
          </p>
          <Button
            type="submit"
            variant="primary"
            loading={add.isPending}
            disabled={!body.trim()}
          >
            댓글 달기
          </Button>
        </form>
      )}
      {comments.isPending ? (
        <Skeleton className="h-20" />
      ) : !comments.data ? (
        <ErrorState
          description={whiteboardErrorMessage(comments.error)}
          onRetry={() => void comments.refetch()}
        />
      ) : open.length === 0 && resolved.length === 0 ? (
        <EmptyState title="댓글이 없습니다" />
      ) : (
        <>
          <ul className="grid gap-2" aria-label="열린 댓글">
            {open.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                canEdit={canEdit}
                onFocus={onFocus}
                onResolve={() => resolve.mutate(comment)}
                onRemove={() => remove.mutate(comment)}
              />
            ))}
          </ul>
          {resolved.length > 0 && (
            <Button
              variant="ghost"
              aria-expanded={showResolved}
              onClick={() => setShowResolved(!showResolved)}
            >
              해결된 댓글 {resolved.length}개 {showResolved ? "숨기기" : "보기"}
            </Button>
          )}
          {showResolved && (
            <ul className="grid gap-2" aria-label="해결된 댓글">
              {resolved.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  canEdit={canEdit}
                  onFocus={onFocus}
                  onResolve={() => resolve.mutate(comment)}
                  onRemove={() => remove.mutate(comment)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </aside>
  );
}

function CommentItem({
  comment,
  canEdit,
  onFocus,
  onResolve,
  onRemove,
}: {
  readonly comment: WhiteboardComment;
  readonly canEdit: boolean;
  readonly onFocus: (elementId: string) => void;
  readonly onResolve: () => void;
  readonly onRemove: () => void;
}) {
  return (
    <li
      className="whiteboard-comment grid gap-1"
      data-resolved={comment.resolved || undefined}
    >
      <p className="text-sm text-muted">
        {comment.author?.name ?? "알 수 없음"} ·{" "}
        {formatDate(comment.createdAt, { year: undefined })}
      </p>
      <p className="[overflow-wrap:anywhere] whitespace-pre-wrap">
        {comment.body}
      </p>
      <div className="flex flex-wrap gap-1">
        {comment.elementId && (
          <Button
            variant="ghost"
            className="ui-button-sm"
            onClick={() => onFocus(comment.elementId!)}
          >
            요소 보기
          </Button>
        )}
        {canEdit && (
          <Button variant="ghost" className="ui-button-sm" onClick={onResolve}>
            {comment.resolved ? "다시 열기" : "해결"}
          </Button>
        )}
        {comment.canDelete && (
          <Button variant="ghost" className="ui-button-sm" onClick={onRemove}>
            지우기
          </Button>
        )}
      </div>
    </li>
  );
}
