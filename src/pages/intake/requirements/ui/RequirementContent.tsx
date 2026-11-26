import {
  eventKindLabels,
  safeHref,
  requirementStatusLabels,
  type RequirementDetail,
} from "@/entities/requirement";
import { formatDate } from "@/shared/lib";
import { Markdown } from "@/shared/ui";
const dateTime = { hour: "2-digit", minute: "2-digit" } as const;

export function Sections({
  requirement,
}: {
  readonly requirement: RequirementDetail;
}) {
  return (
    <section className="requirement-submission" aria-labelledby="req-sections">
      <h2 id="req-sections">제출 내용</h2>
      <div className="requirement-section-list">
        {requirement.sections.map((section) => (
          <section key={section.key} className="requirement-section">
            <h3>
              {section.key === "background"
                ? "배경과 문제"
                : section.label.replaceAll("·", ", ")}
            </h3>
            <Markdown>{section.body}</Markdown>
          </section>
        ))}
        {requirement.references.length > 0 && (
          <section className="requirement-section">
            <h3>참고 자료</h3>
            <div>
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
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

/** 요청자 정보는 서버가 줄 때만(PM·헤드 어드민) 보인다. 업무·메모에 옮겨 적지 않는다(D12-1). */
export function Requester({
  requirement,
}: {
  readonly requirement: RequirementDetail;
}) {
  if (requirement.requesterPurgedAt)
    return (
      <section
        className="requirement-card grid gap-3"
        aria-labelledby="req-requester"
      >
        <h2 id="req-requester" className="text-sm font-semibold">
          요청자
        </h2>
        <p className="text-sm text-muted">
          {formatDate(requirement.requesterPurgedAt)}에 요청자 정보를 지웠어요.
        </p>
      </section>
    );
  const requester = requirement.requester;
  if (!requester) return null;
  return (
    <section
      className="requirement-card grid gap-3"
      aria-labelledby="req-requester"
    >
      <h2 id="req-requester" className="text-sm font-semibold">
        요청자 정보
      </h2>
      <dl className="grid gap-1 text-sm">
        <div>
          <dt className="sr-only">이름</dt>
          <dd>
            {requester.name}, {requester.organization}
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
            {formatDate(requester.consentedAt, dateTime)} 수집, 이용 동의
          </dd>
        </div>
      </dl>
      <p className="text-xs text-muted">
        연락처는 업무, 메모, Discord에 옮겨 적지 마세요.
      </p>
    </section>
  );
}

export function Events({
  requirement,
}: {
  readonly requirement: RequirementDetail;
}) {
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
              {event.actor?.name ?? "요청자, 시스템"}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
