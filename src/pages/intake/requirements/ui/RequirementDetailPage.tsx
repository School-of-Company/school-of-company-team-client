"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  eventKindLabels,
  RequesterPriorityLabel,
  requirementApi,
  requirementErrorMessage,
  safeHref,
  requirementQueries,
  requirementStatusLabels,
  RequirementStatusBadge,
  type MessageVisibility,
  type RequirementDetail,
} from "@/entities/requirement";
import { isHeadAdmin, type User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import { formatDate } from "@/shared/lib";
import {
  Badge,
  Button,
  ErrorState,
  Field,
  Skeleton,
  Textarea,
  useToast,
} from "@/shared/ui";
import { useRequirementChange } from "../api/change";
import { RequirementActions } from "./RequirementActions";
import { RequirementTasks } from "./RequirementTasks";

const dateTime = { hour: "2-digit", minute: "2-digit" } as const;

export function RequirementDetailPage({
  requirementId,
}: {
  readonly requirementId: string;
}) {
  return (
    <AuthGuard require="work">
      {(user) => <DetailContent requirementId={requirementId} user={user} />}
    </AuthGuard>
  );
}

function DetailContent({
  requirementId,
  user,
}: {
  readonly requirementId: string;
  readonly user: User;
}) {
  const detail = useQuery(requirementQueries.detail(requirementId));
  if (detail.isPending)
    return (
      <div
        role="status"
        aria-label="요구사항 불러오는 중"
        className="grid gap-4"
      >
        <Skeleton className="w-24" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64" />
      </div>
    );
  if (!detail.data)
    return (
      <ErrorState
        title={
          normalizeApiError(detail.error).status === 404
            ? "요구사항을 찾을 수 없습니다"
            : undefined
        }
        description={requirementErrorMessage(detail.error)}
        onRetry={() => void detail.refetch()}
      />
    );
  const requirement = detail.data;
  return (
    <div className="incident-detail grid gap-5 [overflow-wrap:anywhere] break-keep">
      <header className="page-header">
        <div className="min-w-0">
          <p className="board-breadcrumb">
            <Link href={routes.requirements}>요구사항</Link>
            <span aria-hidden="true">/</span>
            {requirement.projectId ? (
              <Link href={routes.projectRequirements(requirement.projectId)}>
                {requirement.projectKey}
              </Link>
            ) : (
              <span>조직 단위</span>
            )}
          </p>
          <h1 className="task-title font-semibold">{requirement.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
            <RequirementStatusBadge status={requirement.status} />
            <span>{requirement.formTitle ?? "삭제된 양식"}</span>
            <span>접수 {formatDate(requirement.submittedAt, dateTime)}</span>
          </p>
        </div>
      </header>
      <div className="task-detail">
        <div className="task-detail-grid">
          <div className="task-main grid gap-8">
            <Sections requirement={requirement} />
            <RequirementTasks requirement={requirement} />
            <Messages requirement={requirement} />
            <Events requirement={requirement} />
          </div>
          <aside
            className="task-props grid content-start gap-6"
            aria-label="요구사항 속성"
          >
            <dl>
              <div>
                <dt>상태</dt>
                <dd>
                  <RequirementStatusBadge status={requirement.status} />
                </dd>
              </div>
              {requirement.statusReason && (
                <div>
                  <dt>사유</dt>
                  <dd className="whitespace-pre-wrap">
                    {requirement.statusReason}
                  </dd>
                </div>
              )}
              <div>
                <dt>우선순위</dt>
                <dd>
                  <RequesterPriorityLabel
                    priority={requirement.requesterPriority}
                  />
                </dd>
              </div>
              <div>
                <dt>희망 일정</dt>
                <dd>
                  {requirement.desiredDate
                    ? formatDate(requirement.desiredDate)
                    : "없음"}
                </dd>
              </div>
              <div>
                <dt>업무 진행</dt>
                <dd className="tabular-nums">
                  {requirement.progress.done}/{requirement.progress.total} 완료
                </dd>
              </div>
              {requirement.closedAt && (
                <div>
                  <dt>닫힘</dt>
                  <dd>{formatDate(requirement.closedAt)}</dd>
                </div>
              )}
            </dl>
            <Requester requirement={requirement} />
            <RequirementActions
              requirement={requirement}
              lead={isHeadAdmin(user)}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

function Sections({
  requirement,
}: {
  readonly requirement: RequirementDetail;
}) {
  return (
    <section className="grid gap-4" aria-labelledby="req-sections">
      <h2 id="req-sections">제출 내용</h2>
      <dl className="grid gap-4">
        {requirement.sections.map((section) => (
          <div key={section.key} className="grid gap-1">
            <dt className="text-sm font-medium text-muted">{section.label}</dt>
            <dd className="text-sm break-words whitespace-pre-wrap">
              {section.body}
            </dd>
          </div>
        ))}
        {requirement.references.length > 0 && (
          <div className="grid gap-1">
            <dt className="text-sm font-medium text-muted">참고 자료</dt>
            <dd>
              <ul className="grid gap-1 text-sm">
                {requirement.references.map((reference) => (
                  <li key={reference.url} className="break-all">
                    <a
                      href={safeHref(reference.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {reference.url}
                    </a>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

/** 요청자 연락처는 서버가 줄 때만(PM·헤드 어드민) 보인다. 업무·메모에 옮겨 적지 않는다(D12-1). */
function Requester({
  requirement,
}: {
  readonly requirement: RequirementDetail;
}) {
  if (requirement.requesterPurgedAt)
    return (
      <section className="grid gap-2" aria-labelledby="req-requester">
        <h2 id="req-requester" className="text-sm font-semibold">
          요청자
        </h2>
        <p className="text-sm text-muted">
          {formatDate(requirement.requesterPurgedAt)}에 요청자 정보를
          지웠습니다.
        </p>
      </section>
    );
  const requester = requirement.requester;
  if (!requester) return null;
  return (
    <section className="grid gap-2" aria-labelledby="req-requester">
      <h2 id="req-requester" className="text-sm font-semibold">
        요청자 연락처
      </h2>
      <dl className="grid gap-1 text-sm">
        <div>
          <dt className="sr-only">이름</dt>
          <dd>
            {requester.name} · {requester.organization}
          </dd>
        </div>
        <div>
          <dt className="sr-only">이메일</dt>
          <dd className="break-all">
            <a href={`mailto:${requester.email}`} className="underline">
              {requester.email}
            </a>
          </dd>
        </div>
        {requester.phone && (
          <div>
            <dt className="sr-only">연락처</dt>
            <dd>{requester.phone}</dd>
          </div>
        )}
        <div>
          <dt className="sr-only">동의 시각</dt>
          <dd className="text-xs text-muted">
            {formatDate(requester.consentedAt, dateTime)} 수집·이용 동의
          </dd>
        </div>
      </dl>
      <p className="text-xs text-muted">
        연락처는 업무·메모·Discord에 옮겨 적지 마세요.
      </p>
    </section>
  );
}

function Messages({
  requirement,
}: {
  readonly requirement: RequirementDetail;
}) {
  const id = useId();
  const toast = useToast();
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<MessageVisibility>("INTERNAL");
  const [error, setError] = useState<string | null>(null);
  const add = useRequirementChange(
    requirement.id,
    (input: { body: string; visibility: MessageVisibility }) =>
      requirementApi.addMessage(requirement.id, input),
  );
  const remove = useRequirementChange(requirement.id, (messageId: string) =>
    requirementApi.removeMessage(requirement.id, messageId),
  );
  return (
    <section className="grid gap-4" aria-labelledby="req-messages">
      <h2 id="req-messages">대화</h2>
      {requirement.messages.length === 0 ? (
        <p className="text-sm text-muted">아직 메시지가 없습니다.</p>
      ) : (
        <ol className="grid gap-3">
          {requirement.messages.map((message) => (
            <li
              key={message.id}
              className={`grid gap-1 rounded-xl p-4 ${message.visibility === "INTERNAL" ? "bg-surface-box" : "bg-brand-soft"}`}
            >
              <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="font-medium text-foreground-2">
                  {message.authorKind === "REQUESTER"
                    ? "요청자"
                    : (message.author?.name ?? "탈퇴한 팀원")}
                </span>
                <Badge>
                  {message.visibility === "PUBLIC" ? "공개" : "내부 메모"}
                </Badge>
                <span>{formatDate(message.createdAt, dateTime)}</span>
                {message.canDelete && (
                  <Button
                    variant="ghost"
                    className="ui-button-sm ml-auto"
                    disabled={remove.isPending}
                    onClick={() =>
                      remove.mutate(message.id, {
                        onError: (problem) =>
                          toast(requirementErrorMessage(problem), "error"),
                      })
                    }
                  >
                    삭제
                  </Button>
                )}
              </p>
              <p className="text-sm break-words whitespace-pre-wrap">
                {message.body}
              </p>
            </li>
          ))}
        </ol>
      )}
      <form
        noValidate
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const text = body.trim();
          if (!text || text.length > 5000) {
            setError("내용은 1~5000자로 적어 주세요.");
            return;
          }
          if (add.isPending) return;
          add.mutate(
            { body: text, visibility },
            {
              onSuccess: () => {
                setBody("");
                setError(null);
              },
              onError: (problem) => setError(requirementErrorMessage(problem)),
            },
          );
        }}
      >
        {requirement.canManage && (
          <div
            className="ui-segmented"
            role="radiogroup"
            aria-label="공개 범위"
          >
            {(
              [
                ["INTERNAL", "내부 메모"],
                ["PUBLIC", "요청자에게 답변"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="ui-segmented-option">
                <input
                  type="radio"
                  name={`${id}-visibility`}
                  value={value}
                  checked={visibility === value}
                  onChange={() => setVisibility(value)}
                />
                {label}
              </label>
            ))}
          </div>
        )}
        <Field
          id={`${id}-body`}
          label={visibility === "PUBLIC" ? "요청자에게 보낼 답변" : "내부 메모"}
          hint={
            visibility === "PUBLIC"
              ? "요청자 상태 페이지에 '팀' 이름으로 보입니다."
              : "팀원에게만 보입니다."
          }
          error={error ?? undefined}
        >
          <Textarea
            id={`${id}-body`}
            maxLength={5000}
            value={body}
            aria-invalid={!!error || undefined}
            onChange={(event) => setBody(event.target.value)}
          />
        </Field>
        <div>
          <Button type="submit" loading={add.isPending}>
            {visibility === "PUBLIC" ? "답변 보내기" : "메모 남기기"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function Events({ requirement }: { readonly requirement: RequirementDetail }) {
  if (requirement.events.length === 0) return null;
  return (
    <section className="grid gap-3" aria-labelledby="req-events">
      <h2 id="req-events">기록</h2>
      <ol className="grid gap-2 text-sm">
        {requirement.events.map((event, index) => (
          <li
            key={`${event.occurredAt}-${index}`}
            className="flex flex-wrap gap-2"
          >
            <span className="text-muted tabular-nums">
              {formatDate(event.occurredAt, dateTime)}
            </span>
            <span>{eventKindLabels[event.kind] ?? event.kind}</span>
            {event.kind === "STATUS" && event.toStatus && (
              <span className="text-muted">
                {event.fromStatus
                  ? `${requirementStatusLabels[event.fromStatus]} → `
                  : ""}
                {requirementStatusLabels[event.toStatus]}
              </span>
            )}
            <span className="text-muted">
              {event.actor?.name ?? "요청자·시스템"}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
