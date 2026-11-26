"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ProjectAvatar,
  projectAccess,
  projectKeys,
  projectQueries,
} from "@/entities/project";
import { activeUsersQueryOptions, type User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { settingsErrorMessage } from "@/features/project-settings";
import { SettingsPanels } from "./SettingsPanels";
import { isAccessLost } from "../model/access-lost";
import { normalizeApiError } from "@/shared/api";
import { ProjectNav } from "@/widgets/project-nav";
import { ErrorState, ListSkeleton, StaleNotice } from "@/shared/ui";

// 설정은 PM과 헤드 어드민이 여는 화면이라 그 사람들이 보는 탭 수(자동화, 접수 양식 포함)로 잡는다.
const settingsTabs = [
  "기본 정보",
  "멤버와 권한",
  "연동",
  "계획 버킷",
  "알림",
  "자동화",
  "접수 양식",
];
const projectTabs = [
  "보드",
  "문서",
  "스프린트",
  "마일스톤",
  "달력",
  "링크",
  "화이트보드",
  "요구사항",
  "설정",
];

/** 설정 탭 줄과 본문 자리. 탭을 바꾸거나 설정이 늦게 와도 탭 줄 아래가 같은 높이에서 시작한다. */
function SettingsBodySkeleton() {
  return (
    <div className="grid gap-10">
      <div aria-hidden="true" className="settings-nav">
        {settingsTabs.map((label) => (
          // 탭 줄 스타일이 `.settings-nav a`에 걸려 있어 같은 요소로 그린다(href 없는 a 는 초점을 받지 않는다).
          <a key={label} className="ui-nav-link">
            <span className="ui-skeleton-text">{label}</span>
          </a>
        ))}
      </div>
      <ListSkeleton label="설정 불러오는 중" rows={5} />
    </div>
  );
}

/** 머리글(경로, 이미지와 이름), 프로젝트 탭 줄, 설정 본문을 실제와 같은 클래스로 잡는다. */
export function ProjectSettingsSkeleton() {
  return (
    <div
      role="status"
      aria-label="프로젝트 설정 불러오는 중"
      className="grid w-full min-w-0 gap-6"
    >
      <header aria-hidden="true">
        <p className="board-breadcrumb">
          <span className="ui-skeleton-text">프로젝트 / KEY</span>
        </p>
        <div className="flex min-w-0 items-center gap-3">
          <span className="ui-avatar" />
          <h1 className="wrap-anywhere">
            <span className="ui-skeleton-text">프로젝트 이름</span>
          </h1>
        </div>
      </header>
      <div aria-hidden="true" className="project-nav flex border-b">
        {projectTabs.map((label) => (
          <span
            key={label}
            className="ui-nav-link flex shrink-0 items-center border-b-2 border-transparent"
          >
            <span className="ui-skeleton-text">{label}</span>
          </span>
        ))}
      </div>
      <div className="settings-page grid w-full min-w-0">
        <SettingsBodySkeleton />
      </div>
    </div>
  );
}

export function ProjectSettingsPage({
  projectId,
}: {
  readonly projectId: string;
}) {
  return (
    <AuthGuard require="work" fallback={<ProjectSettingsSkeleton />}>
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
  if (project.isPending) return <ProjectSettingsSkeleton />;
  // 5xx·네트워크 실패는 캐시를 두고 위에 안내만 띄운다. 403·404(권한 잃음, 삭제)는 편집 화면을 내린다.
  if (!project.data || (project.isError && isAccessLost(project.error)))
    return (
      <ErrorState
        title="프로젝트를 표시할 수 없습니다"
        description={settingsErrorMessage(normalizeApiError(project.error))}
        onRetry={() => void project.refetch()}
      />
    );
  if (manages && users.isPending) return <ProjectSettingsSkeleton />;
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
    <div className="grid w-full min-w-0 gap-6">
      <StaleNotice query={project} />
      <header>
        <p className="board-breadcrumb">
          <Link href="/projects">프로젝트</Link>
          <span aria-hidden="true">/</span>
          <span>{project.data.key}</span>
        </p>
        <div className="flex min-w-0 items-center gap-3">
          <ProjectAvatar project={project.data} />
          <h1 className="wrap-anywhere">{project.data.name}</h1>
        </div>
      </header>
      <ProjectNav project={project.data} user={user} />
      {/* 머리글, 프로젝트 탭은 다른 탭과 같은 폭, 설정 본문만 읽기 좋은 폭으로 줄인다. */}
      <div className="settings-page grid w-full min-w-0">
        <Suspense fallback={<SettingsBodySkeleton />}>
          <SettingsPanels
            key={projectId}
            project={project.data}
            user={user}
            candidates={users.data ?? []}
            onSaved={refresh}
          />
        </Suspense>
      </div>
    </div>
  );
}
