"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SignalChip, statusLabels } from "@/entities/task";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import { Button, Skeleton } from "@/shared/ui";
import { reviewRequestQueries } from "../api/review-requests";

const relative = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

function since(value: string, now: number) {
  const minutes = Math.max(0, Math.round((now - Date.parse(value)) / 60_000));
  if (minutes < 60) return relative.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 48) return relative.format(-hours, "hour");
  return relative.format(-Math.round(hours / 24), "day");
}

/** 내 보드 상단: 내 GitHub 계정에 걸린 열린 리뷰 요청(읽을 수 있는 업무에 연결된 PR만). */
export function ReviewRequests({
  githubLinked,
}: {
  readonly githubLinked: boolean;
}) {
  const requests = useQuery({
    ...reviewRequestQueries.mine(),
    enabled: githubLinked,
  });
  const count = requests.data?.length ?? 0;
  const overdue = requests.data?.filter((item) => item.overdue).length ?? 0;
  const now = requests.dataUpdatedAt;
  return (
    <section
      className="review-requests"
      aria-labelledby="review-requests-heading"
    >
      <div className="review-requests-header">
        <h2 id="review-requests-heading">리뷰 요청</h2>
        {requests.data && (
          <span className="text-xs text-muted tabular-nums">
            {count}건{overdue > 0 && `, 24시간 초과 ${overdue}건`}
          </span>
        )}
      </div>
      {!githubLinked ? (
        <p className="review-requests-note">
          GitHub 계정이 연결되지 않아 리뷰 요청을 가져올 수 없습니다.
        </p>
      ) : requests.isPending ? (
        <div
          role="status"
          aria-label="리뷰 요청을 불러오는 중"
          className="grid gap-2 p-3"
        >
          <Skeleton className="w-2/3" />
          <Skeleton className="w-1/2" />
        </div>
      ) : requests.isError ? (
        <div
          role="alert"
          className="review-requests-note flex flex-wrap items-center gap-3"
        >
          <span className="text-danger">
            리뷰 요청을 불러오지 못했습니다.{" "}
            {normalizeApiError(requests.error).message}
          </span>
          <Button
            variant="secondary"
            className="ui-button-sm"
            onClick={() => void requests.refetch()}
          >
            다시 시도
          </Button>
        </div>
      ) : count === 0 ? (
        <p className="review-requests-note">내게 요청된 리뷰가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-border">
          {requests.data.map((item) => (
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
                  {since(item.requestedAt, now)} 요청
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
      )}
    </section>
  );
}
