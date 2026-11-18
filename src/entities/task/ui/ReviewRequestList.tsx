import Link from "next/link";
import { routes } from "@/shared/config";
import { relativeSince } from "@/shared/lib";
import type { MyReviewRequest } from "../model/review-request";
import { statusLabels } from "../model/types";
import { SignalChip } from "./SignalChip";

/** 리뷰 요청 행 목록. 내 보드와 홈이 같은 모양을 쓴다. `now`는 데이터를 받은 시각. */
export function ReviewRequestList({
  requests,
  now,
}: {
  readonly requests: readonly MyReviewRequest[];
  readonly now: number;
}) {
  return (
    <ul className="divide-y divide-border">
      {requests.map((item) => (
        <li
          key={`${item.repositoryFullName}#${item.number}`}
          className="review-request-row"
        >
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="review-request-title"
          >
            <span className="font-mono text-xs text-muted">
              {item.repositoryFullName} #{item.number}
            </span>{" "}
            {item.title}
          </a>
          <div className="review-request-meta">
            {item.overdue && (
              <SignalChip tone="danger" icon="alert">
                24시간 초과
              </SignalChip>
            )}
            <SignalChip tone="muted" icon="clock">
              {relativeSince(item.requestedAt, now)} 요청
            </SignalChip>
            {item.draft && (
              <SignalChip tone="muted" icon="minus">
                초안
              </SignalChip>
            )}
            {item.tasks.map((task) => (
              <Link
                key={task.id}
                href={routes.task(task.id)}
                className="review-request-task"
              >
                <span
                  className="status-icon"
                  data-status={task.status}
                  role="img"
                  aria-label={statusLabels[task.status]}
                />
                {task.key && <span className="font-mono">{task.key}</span>}
                <span className="truncate">{task.title}</span>
              </Link>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
