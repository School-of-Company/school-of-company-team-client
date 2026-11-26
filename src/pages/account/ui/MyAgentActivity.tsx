"use client";

import { useQuery } from "@tanstack/react-query";
import { AgentActivityTable, agentQueries } from "@/entities/agent";
import { normalizeApiError } from "@/shared/api";
import { EmptyState, ListSkeleton, QueryState } from "@/shared/ui";

/** 내 토큰으로 부른 MCP 쓰기 도구 기록(최근 100건, 서버 보존 90일). */
export function MyAgentActivity() {
  const activity = useQuery(agentQueries.activity("me", {}));
  return (
    <QueryState
      query={activity}
      skeleton={
        <ListSkeleton
          label="에이전트 활동 불러오는 중"
          rows={3}
          rowClassName="h-12"
        />
      }
      errorMessage={(error) => normalizeApiError(error).message}
      empty={
        <EmptyState
          title="에이전트 활동이 없어요"
          description="쓰기 토큰으로 에이전트가 업무를 바꾸면 여기에 남아요."
        />
      }
    >
      {(items) => (
        <AgentActivityTable
          items={items}
          showUser={false}
          caption="내 에이전트 활동"
        />
      )}
    </QueryState>
  );
}
