"use client";

import Link from "next/link";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  kindLabels,
  ProjectAvatar,
  projectQueries,
  stageLabels,
  type ProjectStage,
} from "@/entities/project";
import { TaskError } from "@/entities/task";
import { AuthGuard } from "@/features/auth";
import { isHeadAdmin } from "@/entities/user";
import { settledData } from "@/shared/lib";
import {
  Badge,
  EmptyState,
  Field,
  ListSkeleton,
  PageHeader,
  QueryState,
  Select,
} from "@/shared/ui";

export function ProjectListPage() {
  return (
    <AuthGuard require="work">
      {(user) => <ProjectListContent canCreate={isHeadAdmin(user)} />}
    </AuthGuard>
  );
}

function ProjectListContent({ canCreate }: { readonly canCreate: boolean }) {
  const [stage, setStage] = useState<ProjectStage | "">("");
  const projects = useQuery({
    ...projectQueries.list(false, stage || undefined),
    placeholderData: keepPreviousData,
  });
  const count = settledData(projects)?.length;
  return (
    <div className="grid gap-5">
      <PageHeader
        title="프로젝트"
        subtitle={
          count === undefined
            ? ""
            : `${stage ? `${stageLabels[stage]} 단계 ` : ""}${count}개`
        }
        actions={
          canCreate && (
            <Link
              href="/admin?create=project"
              className="ui-button ui-button-primary"
            >
              새 프로젝트
            </Link>
          )
        }
      />
      <div className="flex items-end gap-3">
        <div className="max-w-48 grow">
          <Field id="project-stage-filter" label="단계">
            <Select
              id="project-stage-filter"
              value={stage}
              onChange={(event) =>
                setStage(event.target.value as ProjectStage | "")
              }
            >
              <option value="">전체</option>
              {Object.entries(stageLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
      <QueryState
        query={projects}
        skeleton={
          <ListSkeleton
            label="프로젝트를 불러오는 중"
            rows={3}
            rowClassName="h-13"
          />
        }
        error={(error, retry) => <TaskError error={error} onRetry={retry} />}
        empty={
          stage ? (
            <EmptyState
              title={`${stageLabels[stage]} 단계 프로젝트가 없습니다`}
              description="다른 단계를 선택해 보세요."
            />
          ) : (
            <EmptyState
              title="참여할 수 있는 프로젝트가 없습니다"
              description="프로젝트 관리자에게 참여를 요청해 주세요."
            />
          )
        }
      >
        {(data) => (
          <ul className="list">
            {data.map((project) => (
              <li key={project.id} className="list-row">
                <Link
                  href={`/projects/${encodeURIComponent(project.id)}`}
                  className="list-row-main project-list-main"
                >
                  <ProjectAvatar project={project} />
                  <div className="grid min-w-0 gap-0.5">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h2 className="list-row-title">{project.name}</h2>
                      <Badge className="font-mono">{project.key}</Badge>
                    </div>
                    {project.description && (
                      <span className="truncate text-sm text-muted">
                        {project.description}
                      </span>
                    )}
                  </div>
                </Link>
                <span className="list-row-meta">
                  <Badge>{stageLabels[project.stage]}</Badge>
                  <Badge>{kindLabels[project.kind]}</Badge>
                  <Badge>
                    {project.visibility === "TEAM"
                      ? "팀 전체 공개"
                      : "참여자 공개"}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
