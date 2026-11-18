import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api";

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
  readonly publishable: boolean;
};

export type ChannelLink = {
  readonly channelId: string | null;
  readonly status: "NOT_CONFIGURED" | "ACTIVE" | "DISABLED";
  readonly disabledReason: string | null;
  readonly requiredAction: string | null;
  readonly manualPermissionManagement: boolean;
};

type RepositoryChange =
  | {
      readonly action: "link";
      readonly installationId: number;
      readonly repositoryId: number;
    }
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
    enabled,
  });
}

export function useRepositoryChange(projectId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (change: RepositoryChange) => {
      const base = `/api/v1/projects/${projectId}/github`;
      switch (change.action) {
        case "link":
          await api.post(`${base}/repositories`, {
            installationId: change.installationId,
            repositoryId: change.repositoryId,
            isDefault: false,
          });
          return;
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
