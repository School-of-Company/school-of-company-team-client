import { CiChip, ReviewChip, SignalChip } from "@/entities/task";
import { formatDate } from "@/shared/lib";
import type { PullRequestSignal } from "../model/types";

const time = { hour: "2-digit", minute: "2-digit" } as const;

/** PR 행 아래 한 줄: draft·CI·리뷰(merge는 행의 상태 표시가 맡는다). 신호가 없으면 이유를 짧게 알린다. */
export function PullRequestSignals({
  signal,
  merged,
}: {
  readonly signal: PullRequestSignal | null | undefined;
  readonly merged: boolean;
}) {
  if (!signal)
    return (
      <p className="github-link-signals">
        <SignalChip tone="muted" icon="minus">
          신호 없음
        </SignalChip>
        <span className="text-xs text-muted">
          이 PR의 GitHub 웹훅을 아직 받지 못했습니다.
        </span>
      </p>
    );
  const { review } = signal;
  const waiting = review.requested
    .map((person) => person.name ?? `@${person.githubLogin}`)
    .join(", ");
  return (
    <div className="github-link-signals" role="group" aria-label="PR 신호">
      {signal.draft && (
        <SignalChip tone="muted" icon="minus">
          초안
        </SignalChip>
      )}
      {!merged && (
        <a
          href={signal.ci.url}
          target="_blank"
          rel="noopener noreferrer"
          className="signal-link"
          title={
            signal.ci.completedAt
              ? `완료 ${formatDate(signal.ci.completedAt, time)}`
              : "이 커밋의 완료된 CI 결과가 없습니다"
          }
        >
          <CiChip status={signal.ci.status} />
        </a>
      )}
      {review.changesRequested && <ReviewChip signal="CHANGES_REQUESTED" />}
      {review.approved && (
        <ReviewChip signal="APPROVED">승인 {review.approvals}</ReviewChip>
      )}
      {waiting && (
        <ReviewChip signal="REQUESTED">리뷰 대기: {waiting}</ReviewChip>
      )}
      <span className="text-xs text-muted tabular-nums">
        {formatDate(signal.syncedAt, { year: undefined, ...time })}{" "}
        반영
      </span>
    </div>
  );
}
