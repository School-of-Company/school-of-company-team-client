"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { projectQueries } from "@/entities/project";
import { TaskError } from "@/entities/task";
import { AuthGuard } from "@/features/auth";
import { isHeadAdmin } from "@/entities/user";
import { Badge, EmptyState, Skeleton } from "@/shared/ui";

export function ProjectListPage() {
  return (
    <AuthGuard require="work">
      {(user) => <ProjectListContent canCreate={isHeadAdmin(user)} />}
    </AuthGuard>
  );
}

function ProjectListContent({ canCreate }: { readonly canCreate: boolean }) {
  const projects = useQuery(projectQueries.list());
  return (
    <div className="grid gap-6">
      <header className="page-header">
        <h1>프로젝트</h1>
        {canCreate && (
          <Link
            href="/admin?create=project"
            className="ui-button ui-button-primary"
          >
            새 프로젝트
          </Link>
        )}
      </header>
      {projects.isPending ? (
        <div
          role="status"
          aria-label="프로젝트를 불러오는 중"
          className="grid gap-3"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      ) : projects.isError ? (
        <TaskError
          error={projects.error}
          onRetry={() => void projects.refetch()}
        />
      ) : projects.data.length === 0 ? (
        <EmptyState
          title="참여할 수 있는 프로젝트가 없습니다"
          description="프로젝트 관리자에게 참여를 요청해 주세요."
        />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {projects.data.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${encodeURIComponent(project.id)}`}
                className="block py-4 hover:bg-surface-hover"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-base font-medium break-words">
                    {project.name}
                  </h2>
                  <Badge>
                    {project.visibility === "TEAM"
                      ? "팀 전체 공개"
                      : "참여자 공개"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm break-words text-muted">
                  {project.key}
                  {project.description && (
                    <span className="ml-3">{project.description}</span>
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
