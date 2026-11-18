"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  projectAccess,
  projectQueries,
  type ProjectDetail,
} from "@/entities/project";
import { TaskError } from "@/entities/task";
import type { User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { Skeleton } from "@/shared/ui";
import { ProjectHeading } from "@/widgets/project-nav";

export type PlanningContext = {
  readonly project: ProjectDetail;
  readonly user: User;
  /** Sprint·Milestone 관리(헤드 어드민·PM), 아카이브면 false. */
  readonly manages: boolean;
  /** 회고 작성 등 참여자 쓰기(참여자·PM·헤드 어드민), 아카이브면 false. */
  readonly writes: boolean;
};

/** 프로젝트 안 Sprint·Milestone 화면의 공통 틀: 로그인 → 프로젝트 → 머리·탭 → 본문. */
export function ProjectFrame({
  projectId,
  trail,
  children,
}: {
  readonly projectId: string;
  readonly trail?: readonly {
    readonly label: string;
    readonly href?: string;
  }[];
  readonly children: (context: PlanningContext) => ReactNode;
}) {
  return (
    <AuthGuard require="work">
      {(user) => (
        <FrameContent projectId={projectId} user={user} trail={trail}>
          {children}
        </FrameContent>
      )}
    </AuthGuard>
  );
}

function FrameContent({
  projectId,
  user,
  trail,
  children,
}: {
  readonly projectId: string;
  readonly user: User;
  readonly trail?: readonly {
    readonly label: string;
    readonly href?: string;
  }[];
  readonly children: (context: PlanningContext) => ReactNode;
}) {
  const project = useQuery(projectQueries.detail(projectId));
  if (project.isPending)
    return (
      <div
        role="status"
        aria-label="프로젝트 불러오는 중"
        className="grid gap-3"
      >
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-64 max-w-full" />
      </div>
    );
  if (project.isError)
    return (
      <TaskError error={project.error} onRetry={() => void project.refetch()} />
    );
  const access = projectAccess(project.data, user);
  return (
    <div className="planning-page grid min-w-0 gap-6 [overflow-wrap:anywhere] break-keep">
      <ProjectHeading project={project.data} user={user} trail={trail} />
      {children({
        project: project.data,
        user,
        manages: access.manages && !project.data.archived,
        writes: access.editable,
      })}
    </div>
  );
}
