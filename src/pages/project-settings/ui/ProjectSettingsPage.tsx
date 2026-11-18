"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectAccess, projectKeys, projectQueries } from "@/entities/project";
import { activeUsersQueryOptions, type User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { settingsErrorMessage } from "@/features/project-settings";
import { SettingsPanels } from "./SettingsPanels";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import { ErrorState, Spinner } from "@/shared/ui";

export function ProjectSettingsPage({
  projectId,
}: {
  readonly projectId: string;
}) {
  return (
    <AuthGuard require="work">
      {(user) => <ProjectSettingsContent projectId={projectId} user={user} />}
    </AuthGuard>
  );
}

function ProjectSettingsContent({
  projectId,
  user,
}: {
  readonly projectId: string;
  readonly user: User;
}) {
  const client = useQueryClient();
  const project = useQuery({
    ...projectQueries.detail(projectId),
  });
  const manages = Boolean(
    project.data && projectAccess(project.data, user).manages,
  );
  const users = useQuery({
    ...activeUsersQueryOptions(),
    enabled: manages && !project.isError,
  });
  if (project.isPending) return <Spinner label="프로젝트 설정 불러오는 중" />;
  if (project.isError)
    return (
      <ErrorState
        title="프로젝트를 표시할 수 없습니다"
        description={settingsErrorMessage(normalizeApiError(project.error))}
        onRetry={() => void project.refetch()}
      />
    );
  if (manages && users.isPending)
    return <Spinner label="활성 팀원 불러오는 중" />;
  if (manages && users.isError)
    return (
      <ErrorState
        description={settingsErrorMessage(normalizeApiError(users.error))}
        onRetry={() => void users.refetch()}
      />
    );
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: projectKeys.all }),
      client.invalidateQueries({
        queryKey: ["settings-discord-channel", projectId],
      }),
      client.invalidateQueries({
        queryKey: ["settings-repositories", projectId],
      }),
    ]);
  };
  return (
    <div className="mx-auto grid w-full max-w-3xl min-w-0 gap-8 p-4 sm:p-8">
      <header className="grid gap-3">
        <Link
          href={routes.project(projectId)}
          className="w-fit text-sm text-brand underline underline-offset-4"
        >
          프로젝트 보드로
        </Link>
        <h1 className="text-3xl font-semibold break-all">
          {project.data.name} 설정
        </h1>
      </header>
      <SettingsPanels
        key={projectId}
        project={project.data}
        user={user}
        candidates={users.data ?? []}
        onSaved={refresh}
      />
    </div>
  );
}
