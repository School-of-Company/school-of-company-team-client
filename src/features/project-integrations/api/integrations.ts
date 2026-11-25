import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskKeys } from "@/entities/task";
import { api, normalizeApiError } from "@/shared/api";
import { refetchOnVisit } from "@/shared/lib";
import { isImportActive, type RepositoryImport } from "../model/import-status";

const IMPORT_POLL_INTERVAL = 3000;

export type InstallableRepository = {
  readonly installationId: number;
  readonly repositoryId: number;
  readonly fullName: string;
  readonly private: boolean;
  readonly archived: boolean;
};

export type ProjectRepository = {
  readonly id: string;
  readonly repositoryId: number;
  readonly fullName: string;
  readonly private: boolean;
  readonly isDefault: boolean;
  /** 서버가 비공개 저장소 이름을 숨길 때 false. */
  readonly accessible?: boolean;
  readonly import: RepositoryImport | null;
};

export type ChannelLink = {
  readonly channelId: string | null;
  readonly status: "NOT_CONFIGURED" | "ACTIVE" | "DISABLED";
  readonly disabledReason: string | null;
  readonly requiredAction: string | null;
  readonly manualPermissionManagement: boolean;
};

type RepositoryChange =
  | { readonly action: "default"; readonly projectRepositoryId: string | null }
  | { readonly action: "unlink"; readonly projectRepositoryId: string };

export function useProjectRepositories(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["settings-repositories", projectId],
    queryFn: async () =>
      (
        await api.get<readonly ProjectRepository[]>(
          `/api/v1/projects/${projectId}/github/repositories`,
        )
      ).data,
    // 비공개로 바뀐 저장소 이름이 남지 않게 들어올 때·포커스 때마다 다시 받는다.
    ...refetchOnVisit,
    enabled,
  });
}

export function useInstallableRepositories(
  projectId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["settings-installable-repositories", projectId],
    queryFn: async () =>
      (
        await api.get<readonly InstallableRepository[]>(
          `/api/v1/projects/${projectId}/github/installable-repositories`,
        )
      ).data,
    ...refetchOnVisit,
    enabled,
  });
}

export function useRepositoryChange(projectId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (change: RepositoryChange) => {
      const base = `/api/v1/projects/${projectId}/github`;
      switch (change.action) {
        case "default":
          await api.put(`${base}/default-repository`, {
            projectRepositoryId: change.projectRepositoryId,
          });
          return;
        case "unlink":
          await api.delete(
            `${base}/repositories/${change.projectRepositoryId}`,
          );
          return;
        default: {
          const unreachable: never = change;
          return unreachable;
        }
      }
    },
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: ["settings-repositories", projectId],
      }),
  });
}

/** 저장소 하나씩 연결한다. 목록 갱신은 묶음이 끝난 뒤 `refresh`로 한 번만 한다. */
export function useLinkRepository(projectId: string) {
  const client = useQueryClient();
  return {
    link: async (
      repo: InstallableRepository,
      isDefault: boolean,
      signal?: AbortSignal,
    ) => {
      await api.post(
        `/api/v1/projects/${projectId}/github/repositories`,
        {
          installationId: repo.installationId,
          repositoryId: repo.repositoryId,
          isDefault,
        },
        { signal },
      );
    },
    refresh: () =>
      client.invalidateQueries({
        queryKey: ["settings-repositories", projectId],
      }),
  };
}

const importKey = (
  projectId: string,
  projectKey: string,
  projectRepositoryId: string,
) =>
  [
    "settings-repository-import",
    projectId,
    projectKey,
    projectRepositoryId,
  ] as const;
const importPath = (projectId: string, projectRepositoryId: string) =>
  `/api/v1/projects/${projectId}/github/repositories/${projectRepositoryId}/import`;

export function useRepositoryImport(
  projectId: string,
  projectKey: string,
  repository: ProjectRepository,
  enabled: boolean,
) {
  const client = useQueryClient();
  return useQuery({
    queryKey: importKey(projectId, projectKey, repository.id),
    queryFn: async ({ queryKey }) => {
      const previous = client.getQueryData<RepositoryImport | null>(queryKey);
      let next: RepositoryImport | null;
      try {
        next = (
          await api.get<RepositoryImport>(importPath(projectId, repository.id))
        ).data;
      } catch (error) {
        if (normalizeApiError(error).code === "GITHUB_IMPORT_NOT_FOUND")
          return null;
        throw error;
      }
      // 새로 가져온 업무가 생기거나 실행이 끝나면 해당 프로젝트 보드만 갱신한다.
      if (
        previous &&
        next &&
        (next.imported !== previous.imported || next.status !== previous.status)
      )
        void client.invalidateQueries({
          predicate: (query) =>
            taskKeys.isProjectBoard(query.queryKey, projectKey),
        });
      return next;
    },
    initialData: repository.import ?? undefined,
    enabled,
    retry: false,
    refetchInterval: (query) =>
      isImportActive(query.state.data) ? IMPORT_POLL_INTERVAL : false,
  });
}

export function useStartRepositoryImport(
  projectId: string,
  projectKey: string,
  projectRepositoryId: string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (
        await api.post<RepositoryImport>(
          importPath(projectId, projectRepositoryId),
        )
      ).data,
    onSuccess: (data) =>
      client.setQueryData(
        importKey(projectId, projectKey, projectRepositoryId),
        data,
      ),
  });
}

export function useDiscordChannel(projectId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["settings-discord-channel", projectId],
    queryFn: async () =>
      (
        await api.get<ChannelLink>(
          projectId === null
            ? "/api/v1/discord/team-channel"
            : `/api/v1/projects/${projectId}/discord-channel`,
        )
      ).data,
    enabled,
  });
}

export function useLinkDiscordChannel(projectId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      readonly channelId: string;
      readonly privacyConfirmed: boolean;
    }) =>
      (
        await api.put<ChannelLink>(
          projectId === null
            ? "/api/v1/discord/team-channel"
            : `/api/v1/projects/${projectId}/discord-channel`,
          body,
        )
      ).data,
    onSuccess: (data) =>
      client.setQueryData(["settings-discord-channel", projectId], data),
  });
}
