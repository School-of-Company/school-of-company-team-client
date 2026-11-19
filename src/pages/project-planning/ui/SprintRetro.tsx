"use client";

import { useId, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ProjectDetail } from "@/entities/project";
import {
  retroKindLabels,
  retroKinds,
  sprintErrorMessage,
  sprintQueries,
  type RetroEntry,
  type RetroKind,
  type Sprint,
} from "@/entities/sprint";
import { avatarSrc, type User } from "@/entities/user";
import { normalizeApiError } from "@/shared/api";
import { formatDate } from "@/shared/lib";
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  Skeleton,
  Textarea,
} from "@/shared/ui";
import { useRetro } from "../api/sprint-actions";
import { validateRetro } from "../model/validation";

const hints: Readonly<Record<RetroKind, string>> = {
  KEEP: "계속할 것",
  PROBLEM: "걸렸던 것",
  TRY: "다음에 해 볼 것",
};

/** 회고 KPT 3열. 참여자가 실명으로 쓰고, 고치기는 작성자만·지우기는 작성자 또는 PM·헤드 어드민. */
export function SprintRetro({
  project,
  sprint,
  user,
  writes,
  manages,
}: {
  readonly project: ProjectDetail;
  readonly sprint: Sprint;
  readonly user: User;
  readonly writes: boolean;
  readonly manages: boolean;
}) {
  const entries = useQuery(sprintQueries.retro(project.id, sprint.id));
  const actions = useRetro(project.id, sprint.id);
  const [error, setError] = useState<string | null>(null);
  if (sprint.status === "PLANNED")
    return (
      <EmptyState
        title="Sprint를 시작하면 회고를 씁니다"
        description="Keep · Problem · Try 세 칸에 참여자가 한 줄씩 남깁니다."
      />
    );
  if (entries.isPending)
    return (
      <div role="status" aria-label="회고 불러오는 중" className="retro-grid">
        {retroKinds.map((kind) => (
          <Skeleton key={kind} className="h-40" />
        ))}
      </div>
    );
  if (entries.isError)
    return (
      <ErrorState
        title="회고를 불러오지 못했습니다"
        description={sprintErrorMessage(normalizeApiError(entries.error))}
        onRetry={() => void entries.refetch()}
      />
    );
  const canWrite = writes;
  return (
    <div className="grid gap-3">
      {!canWrite && !project.archived && (
        <p className="planning-note">회고는 프로젝트 참여자가 씁니다.</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="retro-grid">
        {retroKinds.map((kind) => (
          <RetroColumn
            key={kind}
            kind={kind}
            entries={entries.data.filter((entry) => entry.kind === kind)}
            user={user}
            canWrite={canWrite}
            manages={manages}
            actions={actions}
            onError={(cause) =>
              setError(
                cause ? sprintErrorMessage(normalizeApiError(cause)) : null,
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function RetroColumn({
  kind,
  entries,
  user,
  canWrite,
  manages,
  actions,
  onError,
}: {
  readonly kind: RetroKind;
  readonly entries: readonly RetroEntry[];
  readonly user: User;
  readonly canWrite: boolean;
  readonly manages: boolean;
  readonly actions: ReturnType<typeof useRetro>;
  readonly onError: (cause: unknown) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (actions.create.isPending) return;
    const problem = validateRetro(draft);
    setInvalid(problem);
    if (problem) return;
    onError(null);
    actions.create.mutate(
      { kind, body: draft.trim() },
      { onSuccess: () => setDraft(""), onError },
    );
  }
  return (
    <section className="retro-column" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="retro-column-title">
        <span>{retroKindLabels[kind]}</span>
        <span className="text-xs font-normal text-muted">{hints[kind]}</span>
        <span className="ml-auto text-xs font-normal text-muted tabular-nums">
          {entries.length}
        </span>
      </h3>
      {entries.length === 0 ? (
        <p className="retro-empty">아직 없습니다.</p>
      ) : (
        <ul className="retro-list">
          {entries.map((entry) =>
            editing === entry.id ? (
              <li key={entry.id} className="retro-entry">
                <RetroEdit
                  entry={entry}
                  pending={actions.update.isPending}
                  onCancel={() => setEditing(null)}
                  onSave={(body) => {
                    onError(null);
                    actions.update.mutate(
                      { id: entry.id, body },
                      { onSuccess: () => setEditing(null), onError },
                    );
                  }}
                />
              </li>
            ) : (
              <li key={entry.id} className="retro-entry">
                <p className="retro-entry-body">{entry.body}</p>
                <div className="retro-entry-meta">
                  <Avatar
                    name={entry.author.name}
                    src={avatarSrc(entry.author.avatarUrl)}
                  />
                  <span>{entry.author.name}</span>
                  <span className="text-muted">
                    {formatDate(entry.createdAt, { year: undefined })}
                  </span>
                  {canWrite && (entry.author.id === user.id || manages) && (
                    <span className="retro-entry-actions">
                      {entry.author.id === user.id && (
                        <Button
                          variant="ghost"
                          className="ui-button-sm"
                          aria-label={`${retroKindLabels[kind]} 항목 고치기`}
                          onClick={() => setEditing(entry.id)}
                        >
                          고치기
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="ui-button-sm"
                        aria-label={`${retroKindLabels[kind]} 항목 지우기`}
                        disabled={actions.remove.isPending}
                        onClick={() => {
                          onError(null);
                          actions.remove.mutate(entry.id, { onError });
                        }}
                      >
                        지우기
                      </Button>
                    </span>
                  )}
                </div>
              </li>
            ),
          )}
        </ul>
      )}
      {canWrite && (
        <form className="retro-form" onSubmit={submit} noValidate>
          <label htmlFor={`${id}-new`} className="sr-only">
            {retroKindLabels[kind]} 새 항목
          </label>
          <Textarea
            id={`${id}-new`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey))
                event.currentTarget.form?.requestSubmit();
            }}
            maxLength={1000}
            placeholder={hints[kind]}
            className="retro-input"
            aria-invalid={invalid ? true : undefined}
            aria-describedby={invalid ? `${id}-error` : undefined}
            disabled={actions.create.isPending}
          />
          {invalid && (
            <p id={`${id}-error`} role="alert" className="text-xs text-danger">
              {invalid}
            </p>
          )}
          <Button
            type="submit"
            variant="secondary"
            className="ui-button-sm"
            loading={
              actions.create.isPending &&
              actions.create.variables?.kind === kind
            }
            disabled={actions.create.isPending}
          >
            추가
          </Button>
        </form>
      )}
    </section>
  );
}

function RetroEdit({
  entry,
  pending,
  onCancel,
  onSave,
}: {
  readonly entry: RetroEntry;
  readonly pending: boolean;
  readonly onCancel: () => void;
  readonly onSave: (body: string) => void;
}) {
  const [body, setBody] = useState(entry.body);
  const problem = validateRetro(body);
  return (
    <form
      className="retro-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!problem && !pending) onSave(body.trim());
      }}
    >
      <Textarea
        aria-label="항목 고치기"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={1000}
        className="retro-input"
        autoFocus
        disabled={pending}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant="secondary"
          className="ui-button-sm"
          loading={pending}
          disabled={!!problem}
        >
          저장
        </Button>
        <Button
          variant="ghost"
          className="ui-button-sm"
          disabled={pending}
          onClick={onCancel}
        >
          취소
        </Button>
      </div>
    </form>
  );
}
