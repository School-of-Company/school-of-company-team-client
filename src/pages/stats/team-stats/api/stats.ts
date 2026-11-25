import { api } from "@/shared/api";
import { keepPreviousKey } from "@/shared/lib";
import { queryOptions } from "@tanstack/react-query";
import type { StatsRange, TeamStats } from "../model/types";

type Scope = "team" | "me";

// 팀과 나는 키 첫 칸부터 다르다: 한쪽 데이터가 다른 쪽 placeholder 로 보이지 않는다.
export const statsKeys = {
  stats: (scope: Scope, range: StatsRange, projectId: string) =>
    ["stats", scope, range, projectId || null] as const,
};

const paths: Record<Scope, string> = {
  team: "/api/v1/stats/team",
  me: "/api/v1/me/stats",
};

export const statsQueries = {
  stats: (scope: Scope, range: StatsRange, projectId: string) =>
    queryOptions({
      queryKey: statsKeys.stats(scope, range, projectId),
      queryFn: async () =>
        (
          await api.get<TeamStats>(paths[scope], {
            params: { range, ...(projectId ? { projectId } : {}) },
          })
        ).data,
      // 기간과 프로젝트를 바꾸는 동안 앞 결과를 흐리게 남겨 자리를 지킨다.
      placeholderData: keepPreviousKey(
        statsKeys.stats(scope, range, projectId),
      ),
      // 서버가 60초 캐시한다(D18-p).
      staleTime: 60_000,
      retry: false,
    }),
};
