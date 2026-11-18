import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";
import { refetchOnVisit } from "@/shared/lib";
import type { PublicationRepository, TaskGithub } from "../model/types";

const taskPath = (id: string) =>
  `/api/v1/tasks/${encodeURIComponent(id)}/github`;
export const taskGithubApi = {
  get: async (id: string) => (await api.get<TaskGithub>(taskPath(id))).data,
  target: async (id: string, projectRepositoryId: string | null) =>
    (
      await api.put<TaskGithub>(`${taskPath(id)}/publication-target`, {
        projectRepositoryId,
      })
    ).data,
  retry: async (id: string) =>
    (await api.post<TaskGithub>(`${taskPath(id)}/publication/retry`)).data,
  link: async (
    id: string,
    body: { readonly url: string; readonly primary: boolean },
  ) => (await api.post<TaskGithub>(`${taskPath(id)}/links`, body)).data,
  unlink: async (id: string, linkId: string) => {
    await api.delete(`${taskPath(id)}/links/${encodeURIComponent(linkId)}`);
  },
  repositories: async (projectId: string) =>
    (
      await api.get<readonly PublicationRepository[]>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/github/repositories`,
      )
    ).data,
  importIssue: async (body: {
    readonly url: string;
    readonly scope: "PROJECT" | "PERSONAL";
    readonly projectId?: string;
  }) =>
    (
      await api.post<{ readonly taskId: string; readonly created: boolean }>(
        "/api/v1/github/issue-imports",
        body,
      )
    ).data,
};
export const taskGithubQueries = {
  detail: (id: string) =>
    queryOptions({
      queryKey: ["tasks", "github", id],
      queryFn: () => taskGithubApi.get(id),
      refetchInterval: BOARD_POLL_INTERVAL,
      gcTime: 0,
      retry: false,
    }),
  repositories: (projectId: string) =>
    queryOptions({
      queryKey: ["projects", projectId, "github-repositories"],
      queryFn: () => taskGithubApi.repositories(projectId),
      // 비공개로 바뀐 저장소가 선택지에 남지 않게 들어올 때·포커스 때마다 다시 받는다.
      ...refetchOnVisit,
      retry: false,
    }),
};
