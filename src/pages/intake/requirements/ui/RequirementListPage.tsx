"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { projectQueries } from "@/entities/project";
import { TaskError } from "@/entities/task";
import { isHeadAdmin, type User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { PageHeader } from "@/shared/ui";
import { ProjectHeading, ProjectHeadingSkeleton } from "@/widgets/project-nav";
import { RequirementInbox, RequirementInboxSkeleton } from "./RequirementInbox";

/** 사이드바 "요구사항": 헤드 어드민은 조직 단위 + 전체, 다른 팀원은 읽을 수 있는 프로젝트의 요구사항. */
export function RequirementListPage() {
  return (
    <AuthGuard require="work">
      {(user) => (
        <div className="grid min-w-0 gap-5">
          <PageHeader
            title="요구사항"
            subtitle="외부 요청자가 접수 양식으로 보낸 요구사항입니다."
          />
          <Suspense fallback={<RequirementInboxSkeleton />}>
            <RequirementInbox isLead={isHeadAdmin(user)} />
          </Suspense>
        </div>
      )}
    </AuthGuard>
  );
}

/** 프로젝트 탭 "요구사항": 그 프로젝트로 접수된 것만. */
export function ProjectRequirementsPage({
  projectId,
}: {
  readonly projectId: string;
}) {
  return (
    <AuthGuard require="work" fallback={<ProjectHeadingSkeleton />}>
      {(user) => <ProjectRequirements projectId={projectId} user={user} />}
    </AuthGuard>
  );
}

function ProjectRequirements({
  projectId,
  user,
}: {
  readonly projectId: string;
  readonly user: User;
}) {
  const project = useQuery(projectQueries.detail(projectId));
  if (project.isPending) return <ProjectHeadingSkeleton />;
  if (project.isError)
    return (
      <TaskError error={project.error} onRetry={() => void project.refetch()} />
    );
  return (
    <div className="grid min-w-0 gap-6 [overflow-wrap:anywhere] break-keep">
      <ProjectHeading project={project.data} user={user} />
      <Suspense fallback={<RequirementInboxSkeleton />}>
        <RequirementInbox projectId={projectId} isLead={isHeadAdmin(user)} />
      </Suspense>
    </div>
  );
}
