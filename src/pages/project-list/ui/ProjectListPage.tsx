"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { projectQueries } from "@/entities/project";
import { TaskError } from "@/entities/task";
import { AuthGuard } from "@/features/auth";
import { Badge, EmptyState, Spinner } from "@/shared/ui";

export function ProjectListPage() {
  return (
    <AuthGuard require="work">
      <ProjectListContent />
    </AuthGuard>
  );
}

function ProjectListContent() {
  const projects = useQuery(projectQueries.list());
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold tracking-tight">프로젝트</h1>
      {projects.isPending ? (
        <Spinner label="프로젝트를 불러오는 중" />
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
        <ul className="divide-y divide-border rounded-md border border-border bg-surface">
          {projects.data.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${encodeURIComponent(project.id)}`}
                className="block p-5 hover:bg-surface-hover"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold break-words">
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
                  {project.description ? ` · ${project.description}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
