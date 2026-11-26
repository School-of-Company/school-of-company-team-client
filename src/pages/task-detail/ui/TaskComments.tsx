"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { avatarSrc } from "@/entities/user";
import { normalizeApiError } from "@/shared/api";
import { formatDate } from "@/shared/lib";
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  EmptyState,
  ListSkeleton,
  Markdown,
  QueryState,
  Textarea,
} from "@/shared/ui";
import {
  commentApi,
  commentKeys,
  commentQueries,
  type TaskComment,
} from "../api/comments";
import {
  COMMENT_MAX_LENGTH,
  commentBodyError,
  commentPermissions,
} from "../model/comments";

type Viewer = { readonly id: string; readonly role: string };

const dateTime: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
};

function CommentForm({
  id,
  initial = "",
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  readonly id: string;
  readonly initial?: string;
  readonly submitLabel: string;
  readonly pending: boolean;
  readonly error: unknown;
  readonly onSubmit: (body: string) => Promise<unknown>;
  readonly onCancel?: () => void;
}) {
  const [body, setBody] = useState(initial);
  const [invalid, setInvalid] = useState<string | null>(null);
  const message = invalid ?? (error ? normalizeApiError(error).message : null);
  const over = body.length > COMMENT_MAX_LENGTH;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const problem = commentBodyError(body);
    setInvalid(problem);
    if (!problem)
      void onSubmit(body).then(
        () => setBody(""),
        () => undefined,
      );
  }
  return (
    <form className="grid gap-2" onSubmit={submit} noValidate>
      <label htmlFor={id} className="sr-only">
        {submitLabel}
      </label>
      <Textarea
        id={id}
        value={body}
        placeholder="마크다운으로 쓸 수 있어요"
        disabled={pending}
        aria-invalid={!!message || over || undefined}
        aria-describedby={message ? `${id}-count ${id}-error` : `${id}-count`}
        onChange={(event) => setBody(event.target.value)}
      />
      {/* 붙여 넣은 글을 조용히 자르지 않고 글자 수를 보여 준다. 줄은 늘 있어 높이가 바뀌지 않는다. */}
      <p
        id={`${id}-count`}
        className={`text-right text-xs ${over ? "text-danger" : "text-muted"}`}
      >
        {body.length.toLocaleString("ko-KR")} /{" "}
        {COMMENT_MAX_LENGTH.toLocaleString("ko-KR")}자
      </p>
      {message && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {message}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" disabled={pending} onClick={onCancel}>
            취소
          </Button>
        )}
        <Button type="submit" variant="secondary" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function CommentItem({
  comment,
  viewer,
  onDelete,
}: {
  readonly comment: TaskComment;
  readonly viewer: Viewer | undefined;
  readonly onDelete: () => void;
}) {
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { canEdit, canDelete } = commentPermissions(comment, viewer);
  const update = useMutation({
    mutationFn: (body: string) =>
      commentApi.update(comment.taskId, comment.id, body),
    onSuccess: (saved) => {
      client.setQueryData(
        commentKeys.list(comment.taskId),
        (current: readonly TaskComment[] | undefined) =>
          current?.map((item) => (item.id === saved.id ? saved : item)),
      );
      setEditing(false);
    },
  });
  const author = comment.author?.name ?? "알 수 없음";
  return (
    <li className="task-comment">
      <div className="task-comment-head">
        <Avatar name={author} src={avatarSrc(comment.author?.avatarUrl)} />
        <span className="font-semibold">{author}</span>
        {comment.viaAgent && <Badge className="badge-blue">에이전트</Badge>}
        {comment.viaAutomation && <Badge>자동화</Badge>}
        <time className="text-xs text-muted" dateTime={comment.createdAt}>
          {formatDate(comment.createdAt, dateTime)}
        </time>
        {comment.editedAt && <span className="text-xs text-muted">수정됨</span>}
        {!editing && (canEdit || canDelete) && (
          <span className="ml-auto flex gap-1">
            {canEdit && (
              <Button
                variant="ghost"
                className="ui-button-sm"
                aria-label={`${author}님 댓글 수정`}
                onClick={() => {
                  update.reset();
                  setEditing(true);
                }}
              >
                수정
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                className="ui-button-sm"
                aria-label={`${author}님 댓글 삭제`}
                onClick={onDelete}
              >
                삭제
              </Button>
            )}
          </span>
        )}
      </div>
      {editing ? (
        <CommentForm
          id={`comment-edit-${comment.id}`}
          initial={comment.body}
          submitLabel="댓글 저장"
          pending={update.isPending}
          error={update.error}
          onSubmit={(body) => update.mutateAsync(body)}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <Markdown>{comment.body}</Markdown>
      )}
    </li>
  );
}

export function TaskComments({
  taskId,
  viewer,
}: {
  readonly taskId: string;
  readonly viewer: Viewer | undefined;
}) {
  const client = useQueryClient();
  const comments = useQuery(commentQueries.list(taskId));
  const [deleting, setDeleting] = useState<TaskComment | null>(null);
  const create = useMutation({
    mutationFn: (body: string) => commentApi.create(taskId, body),
    onSuccess: (saved) =>
      client.setQueryData(
        commentKeys.list(taskId),
        (current: readonly TaskComment[] | undefined) => [
          ...(current ?? []),
          saved,
        ],
      ),
  });
  const remove = useMutation({
    mutationFn: (comment: TaskComment) => commentApi.delete(taskId, comment.id),
    onSuccess: (_, comment) => {
      client.setQueryData(
        commentKeys.list(taskId),
        (current: readonly TaskComment[] | undefined) =>
          current?.filter((item) => item.id !== comment.id),
      );
      setDeleting(null);
    },
  });
  return (
    <section className="grid gap-4" aria-labelledby="task-comments-title">
      <h2 id="task-comments-title" className="task-section-title">
        댓글
      </h2>
      <QueryState
        query={comments}
        skeleton={
          <ListSkeleton label="댓글 불러오는 중" rows={2} rowClassName="h-20" />
        }
        errorMessage={(error) => normalizeApiError(error).message}
        empty={
          <EmptyState
            title="댓글이 없어요"
            description="진행 상황이나 결정을 아래에 남겨 보세요."
          />
        }
      >
        {(items) => (
          <ol className="task-comments" aria-label="댓글 목록">
            {items.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                viewer={viewer}
                onDelete={() => {
                  remove.reset();
                  setDeleting(comment);
                }}
              />
            ))}
          </ol>
        )}
      </QueryState>
      {viewer && (
        <CommentForm
          id={`comment-new-${taskId}`}
          submitLabel="댓글 남기기"
          pending={create.isPending}
          error={create.error}
          onSubmit={(body) => create.mutateAsync(body)}
        />
      )}
      <Dialog
        open={deleting !== null}
        onClose={() => {
          if (!remove.isPending) setDeleting(null);
        }}
        title="댓글을 삭제할까요?"
      >
        <div className="grid gap-5">
          <p className="text-sm leading-6 text-muted">
            삭제한 댓글은 목록에서 사라지고 되돌릴 수 없어요.
          </p>
          {remove.isError && (
            <p role="alert" className="text-sm text-danger">
              {normalizeApiError(remove.error).message}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="secondary"
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
            >
              취소
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => {
                if (deleting && !remove.isPending) remove.mutate(deleting);
              }}
            >
              삭제
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}
