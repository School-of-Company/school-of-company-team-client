"use client";

import { useId, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  formatDateTime,
  incidentApi,
  incidentErrorMessage,
  incidentQueries,
  isNotFound,
  postmortemStatusLabels,
  postmortemDisplaySections,
  type IncidentDetail,
  type Postmortem,
  type PostmortemSections,
} from "@/entities/incident";
import {
  Button,
  EmptyState,
  ErrorState,
  Label,
  Markdown,
  Skeleton,
  Textarea,
} from "@/shared/ui";
import { usePostmortemMutation } from "../api/mutations";
import { ActionItems } from "./ActionItems";

const sections: readonly {
  readonly key: keyof PostmortemSections;
  readonly label: string;
  readonly empty: string;
}[] = [
  { key: "summary", label: "요약", empty: "요약이 비어 있어요." },
  { key: "impact", label: "영향", empty: "영향이 비어 있어요." },
  {
    key: "rootCause",
    label: "원인",
    empty: "원인은 사람이 써요. 아직 비어 있어요.",
  },
  { key: "timeline", label: "타임라인", empty: "타임라인이 비어 있어요." },
];

/** 사고당 하나. 만들 때 사고 사실(시각·영향 서비스·타임라인)로 결정적 초안을 채운다(LLM 없음, D7-6). */
export function PostmortemPanel({
  incident,
}: {
  readonly incident: IncidentDetail;
}) {
  const postmortem = useQuery(incidentQueries.postmortem(incident.id));
  const create = usePostmortemMutation(incident.id, () =>
    incidentApi.createPostmortem(incident.id),
  );
  if (postmortem.isPending)
    return (
      <div
        role="status"
        aria-label="사후 검토를 불러오는 중"
        className="grid gap-3"
      >
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40" />
      </div>
    );
  if (!postmortem.data && isNotFound(postmortem.error, "POSTMORTEM_NOT_FOUND"))
    return (
      <EmptyState
        title="사후 검토가 아직 없어요"
        description={
          incident.canEdit
            ? "시작하면 장애 시각, 영향 서비스, 타임라인으로 요약, 영향, 타임라인 초안을 채워요. 원인은 직접 써요."
            : "장애 작성자, 대응 책임자, 영향 서비스 소유자, 헤드 어드민이 시작할 수 있어요."
        }
        action={
          incident.canEdit && (
            <div className="grid justify-items-center gap-2">
              <Button
                loading={create.isPending}
                onClick={() => {
                  if (!create.isPending) create.mutate(undefined);
                }}
              >
                사후 검토 시작
              </Button>
              {create.error ? (
                <p role="alert" className="text-sm text-danger">
                  {incidentErrorMessage(create.error)}
                </p>
              ) : null}
            </div>
          )
        }
      />
    );
  if (!postmortem.data)
    return (
      <ErrorState
        description={incidentErrorMessage(postmortem.error)}
        onRetry={() => void postmortem.refetch()}
      />
    );
  return (
    <PostmortemBody
      incident={incident}
      postmortem={{
        ...postmortem.data,
        ...postmortemDisplaySections(postmortem.data, incident),
      }}
    />
  );
}

function PostmortemBody({
  incident,
  postmortem,
}: {
  readonly incident: IncidentDetail;
  readonly postmortem: Postmortem;
}) {
  const [editing, setEditing] = useState(false);
  const publish = usePostmortemMutation(incident.id, () =>
    incidentApi.updatePostmortem(incident.id, {
      status: postmortem.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
    }),
  );
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="knowledge-status" data-status={postmortem.status}>
            {postmortemStatusLabels[postmortem.status]}
          </span>
          <span className="text-muted">
            마지막 수정 {formatDateTime(postmortem.updatedAt)},{" "}
            {postmortem.updatedBy?.name ?? "알 수 없음"}
          </span>
          {postmortem.publishedAt && (
            <span className="text-muted">
              처음 게시 {formatDateTime(postmortem.publishedAt)}
            </span>
          )}
        </p>
        {postmortem.canEdit && !editing && (
          <span className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="ui-button-sm"
              onClick={() => setEditing(true)}
            >
              수정
            </Button>
            <Button
              variant="secondary"
              className="ui-button-sm"
              loading={publish.isPending}
              onClick={() => {
                if (!publish.isPending) publish.mutate(undefined);
              }}
            >
              {postmortem.status === "PUBLISHED" ? "초안으로 되돌리기" : "게시"}
            </Button>
          </span>
        )}
      </div>
      {publish.error ? (
        <p role="alert" className="text-sm text-danger">
          {incidentErrorMessage(publish.error)}
        </p>
      ) : null}
      {editing ? (
        <PostmortemEditor
          incident={incident}
          postmortem={postmortem}
          onDone={() => setEditing(false)}
        />
      ) : (
        <div className="postmortem-sections">
          {sections.map((section) => (
            <section key={section.key} aria-labelledby={`pm-${section.key}`}>
              <h3 id={`pm-${section.key}`}>{section.label}</h3>
              {postmortem[section.key].trim() ? (
                <Markdown>{postmortem[section.key]}</Markdown>
              ) : (
                <p className="text-sm text-muted">{section.empty}</p>
              )}
            </section>
          ))}
        </div>
      )}
      <ActionItems incident={incident} postmortem={postmortem} />
    </div>
  );
}

function PostmortemEditor({
  incident,
  postmortem,
  onDone,
}: {
  readonly incident: IncidentDetail;
  readonly postmortem: Postmortem;
  readonly onDone: () => void;
}) {
  const id = useId();
  const incidentId = incident.id;
  const [values, setValues] = useState<PostmortemSections>({
    summary: postmortem.summary,
    impact: postmortem.impact,
    rootCause: postmortem.rootCause,
    timeline: postmortem.timeline,
  });
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [refill, setRefill] = useState<{
    readonly pending: boolean;
    readonly error: string;
  }>({ pending: false, error: "" });
  const save = usePostmortemMutation(incidentId, () =>
    incidentApi.updatePostmortem(
      incidentId,
      // 보낸 섹션만 바뀐다. 손대지 않은 섹션은 보내지 않아 다른 사람의 저장을 덮지 않는다.
      Object.fromEntries(
        sections
          .filter((section) => values[section.key] !== postmortem[section.key])
          .map((section) => [section.key, values[section.key]]),
      ),
    ),
  );
  async function refillTimeline() {
    if (refill.pending) return;
    setRefill({ pending: true, error: "" });
    try {
      const draft = await incidentApi.draft(incidentId);
      setValues((current) => ({
        ...current,
        timeline: postmortemDisplaySections(draft, incident).timeline,
      }));
      setRefill({ pending: false, error: "" });
    } catch (cause) {
      setRefill({ pending: false, error: incidentErrorMessage(cause) });
    }
  }
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (save.isPending) return;
    save.mutate(undefined, { onSuccess: onDone });
  };
  return (
    <form className="grid gap-5" onSubmit={submit}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="ui-segmented" role="group" aria-label="사후 검토 보기">
          {(["write", "preview"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className="ui-segmented-option"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {value === "write" ? "작성" : "미리보기"}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          className="ui-button-sm"
          loading={refill.pending}
          onClick={() => void refillTimeline()}
        >
          타임라인 다시 채우기
        </Button>
      </div>
      {refill.error && (
        <p role="alert" className="text-sm text-danger">
          {refill.error}
        </p>
      )}
      {sections.map((section) => (
        <div key={section.key} className="grid gap-2">
          <Label htmlFor={`${id}-${section.key}`}>{section.label}</Label>
          {mode === "write" ? (
            <Textarea
              id={`${id}-${section.key}`}
              value={values[section.key]}
              maxLength={20000}
              className={section.key === "timeline" ? "min-h-48" : ""}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [section.key]: event.target.value,
                }))
              }
            />
          ) : values[section.key].trim() ? (
            <div id={`${id}-${section.key}`} className="postmortem-preview">
              <Markdown>{values[section.key]}</Markdown>
            </div>
          ) : (
            <p id={`${id}-${section.key}`} className="text-sm text-muted">
              {section.empty}
            </p>
          )}
        </div>
      ))}
      {save.error ? (
        <p role="alert" className="text-sm text-danger">
          {incidentErrorMessage(save.error)}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={save.isPending} onClick={onDone}>
          취소
        </Button>
        <Button type="submit" loading={save.isPending}>
          저장
        </Button>
      </div>
    </form>
  );
}
