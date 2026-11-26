"use client";

import { useQuery } from "@tanstack/react-query";
import { statusLabels } from "@/entities/task";
import { normalizeApiError } from "@/shared/api";
import { formatDate } from "@/shared/lib";
import { Badge, ListSkeleton, QueryState } from "@/shared/ui";
import { commentQueries } from "../api/comments";

const dateTime: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
};

/** 상태 전이 이력. 에이전트(MCP)로 바꾼 줄에는 "에이전트로 변경"을 붙인다. */
export function TaskHistory({ taskId }: { readonly taskId: string }) {
  const history = useQuery(commentQueries.history(taskId));
  return (
    <QueryState
      query={history}
      skeleton={
        <ListSkeleton
          label="변경 이력 불러오는 중"
          rows={2}
          rowClassName="h-6"
        />
      }
      errorMessage={(error) => normalizeApiError(error).message}
      // 업무는 만들 때 첫 줄이 생기므로 빈 이력은 V34 이전 업무뿐이다.
      empty={<p className="text-sm text-muted">기록된 상태 변경이 없어요.</p>}
    >
      {(entries) => (
        <ol className="task-history" aria-label="상태 변경 이력">
          {entries.map((entry, index) => (
            <li key={`${entry.changedAt}-${index}`}>
              <span>
                {entry.from
                  ? `${statusLabels[entry.from]} → ${statusLabels[entry.to]}`
                  : `생성 → ${statusLabels[entry.to]}`}
              </span>
              <span className="text-muted">
                {entry.actor?.name ?? "알 수 없음"}
              </span>
              {entry.viaAgent && (
                <Badge className="badge-blue">에이전트로 변경</Badge>
              )}
              <time className="text-xs text-muted" dateTime={entry.changedAt}>
                {formatDate(entry.changedAt, dateTime)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </QueryState>
  );
}
