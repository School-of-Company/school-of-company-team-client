import { api } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";
import { queryOptions } from "@tanstack/react-query";
import type { Project, ProjectDetail } from "../model/types";

export const projectKeys = {
  all: ["projects"] as const,
  detail: (id: string) => ["projects", id] as const,
};
export const projectApi = {
  list: async (includeArchived = false) =>
    (
      await api.get<readonly Project[]>("/api/v1/projects", {
        params: { includeArchived },
      })
    ).data,
  detail: async (id: string) =>
    (await api.get<ProjectDetail>(`/api/v1/projects/${encodeURIComponent(id)}`))
      .data,
};

export const projectQueries = {
  list: (includeArchived = false) =>
    queryOptions({
      queryKey: [...projectKeys.all, "list", includeArchived],
      queryFn: () => projectApi.list(includeArchived),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: projectKeys.detail(id),
      queryFn: () => projectApi.detail(id),
      refetchInterval: BOARD_POLL_INTERVAL,
      retry: false,
    }),
};
