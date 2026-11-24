"use client";

import Link from "next/link";
import { Suspense, useId, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { projectAccess, projectQueries } from "@/entities/project";
import type { User } from "@/entities/user";
import { ProjectHeading } from "@/widgets/project-nav";
import {
  KindLabel,
  kindLabels,
  knowledgeErrorMessage,
  knowledgeKinds,
  knowledgeQueries,
  knowledgeStatuses,
  knowledgeStatusLabels,
  KnowledgeStatusLabel,
  type KnowledgeSummary,
} from "@/entities/knowledge";
import { AuthGuard } from "@/features/auth";
import { CreateDocumentDialog } from "@/features/manage-knowledge";
import { routes } from "@/shared/config";
import { formatDate } from "@/shared/lib";
import {
  Button,
  Badge,
  EmptyState,
  ErrorState,
  Icon,
  Select,
  Skeleton,
  Spinner,
} from "@/shared/ui";

/** 종류 필터가 있는 한 목록. 종류·상태는 URL `?type=`·`?status=`에 둔다(AGENTS.md). */
export function KnowledgeListPage() {
  return (
    <AuthGuard require="work">
      {(user) => (
        <Suspense fallback={<Spinner label="문서 불러오는 중" />}>
          <KnowledgeListContent user={user} />
        </Suspense>
      )}
    </AuthGuard>
  );
}

export function ProjectDocumentsPage({
  projectId,
}: {
  readonly projectId: string;
}) {
  return (
    <AuthGuard require="work">
      {(user) => <ProjectDocuments projectId={projectId} user={user} />}
    </AuthGuard>
  );
}

function ProjectDocuments({
  projectId,
  user,
}: {
  readonly projectId: string;
  readonly user: User;
}) {
  const project = useQuery(projectQueries.detail(projectId));
  if (project.isPending) return <Spinner label="프로젝트 불러오는 중" />;
  if (project.isError)
    return (
      <ErrorState
        description="프로젝트를 불러오지 못했습니다."
        onRetry={() => void project.refetch()}
      />
    );
  return (
    <div className="grid min-w-0 gap-6">
      <ProjectHeading project={project.data} user={user} />
      <Suspense fallback={<Spinner label="문서 불러오는 중" />}>
        <KnowledgeListContent projectId={projectId} user={user} />
      </Suspense>
    </div>
  );
}

function KnowledgeListContent({
  projectId: fixedProjectId,
  user,
}: {
  readonly projectId?: string;
  readonly user: User;
}) {
  const id = useId();
  const router = useRouter();
  const pathname = usePathname() ?? routes.docs;
  const search = useSearchParams();
  const kind = knowledgeKinds.find((value) => value === search?.get("type"));
  const status = knowledgeStatuses.find(
    (value) => value === search?.get("status"),
  );
  const [creating, setCreating] = useState(false);
  const projectId = fixedProjectId ?? search?.get("projectId") ?? undefined;
  const scope =
    !projectId && search?.get("scope") === "ORG" ? "ORG" : undefined;
  const projects = useQuery(projectQueries.list());
  const selectedProject = useQuery({
    ...projectQueries.detail(projectId ?? ""),
    enabled: Boolean(projectId),
  });
  const canCreate =
    !projectId ||
    (selectedProject.isSuccess &&
      !selectedProject.isError &&
      projectAccess(selectedProject.data, user).editable);
  const documents = useQuery(
    knowledgeQueries.list({ kind, status, projectId, scope }),
  );
  const href = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(search?.toString());
    for (const [key, value] of Object.entries(next))
      if (value === null) params.delete(key);
      else params.set(key, value);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  return (
    <div className="grid gap-5">
      <header className="page-header">
        <div className="min-w-0">
          <h1>문서</h1>
          {documents.data && (
            <p className="page-subtitle tabular-nums">
              {kind ? kindLabels[kind] : "전체"} {documents.data.length}개
            </p>
          )}
        </div>
        {canCreate && (
          <Button onClick={() => setCreating(true)}>
            <Icon name="plus" className="inline-block" /> 문서 만들기
          </Button>
        )}
      </header>
      <div className="flex flex-wrap items-center gap-3">
        {!fixedProjectId && (
          <span className="flex items-center gap-2">
            <label htmlFor={`${id}-project`} className="text-sm text-muted">
              프로젝트
            </label>
            <Select
              id={`${id}-project`}
              className="incident-filter-select"
              value={projectId ?? scope ?? ""}
              onChange={(event) =>
                router.replace(
                  href({
                    projectId:
                      event.target.value && event.target.value !== "ORG"
                        ? event.target.value
                        : null,
                    scope: event.target.value === "ORG" ? "ORG" : null,
                  }),
                )
              }
            >
              <option value="">전체</option>
              <option value="ORG">조직</option>
              {projects.data?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </span>
        )}
        <nav aria-label="문서 종류" className="settings-nav">
          <Link
            href={href({ type: null })}
            aria-current={!kind ? "page" : undefined}
          >
            전체
          </Link>
          {knowledgeKinds.map((value) => (
            <Link
              key={value}
              href={href({ type: value })}
              aria-current={kind === value ? "page" : undefined}
            >
              {kindLabels[value]}
            </Link>
          ))}
        </nav>
        <span className="flex items-center gap-2">
          <label htmlFor={`${id}-status`} className="text-sm text-muted">
            상태
          </label>
          <Select
            id={`${id}-status`}
            className="incident-filter-select"
            value={status ?? ""}
            onChange={(event) =>
              router.replace(href({ status: event.target.value || null }))
            }
          >
            <option value="">전체</option>
            {knowledgeStatuses.map((value) => (
              <option key={value} value={value}>
                {knowledgeStatusLabels[value]}
              </option>
            ))}
          </Select>
        </span>
      </div>
      {projects.isError && !fixedProjectId && (
        <p role="alert" className="text-sm text-danger">
          프로젝트 필터를 불러오지 못했습니다.{" "}
          <Button variant="ghost" onClick={() => void projects.refetch()}>
            다시 시도
          </Button>
        </p>
      )}
      {documents.isFetching && !documents.isPending && (
        <p role="status" className="text-sm text-muted">
          문서 갱신 중
        </p>
      )}
      {documents.isPending ? (
        <div
          role="status"
          aria-label="문서를 불러오는 중"
          className="grid gap-2"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      ) : documents.isError || !documents.data ? (
        <ErrorState
          description={knowledgeErrorMessage(documents.error)}
          onRetry={() => void documents.refetch()}
        />
      ) : documents.data.length === 0 ? (
        !kind && !status ? (
          <EmptyState
            title="아직 문서가 없습니다"
            description="결정은 ADR, 제안은 RFC, 장애, 운영 대응 절차는 Runbook으로 남기세요."
          />
        ) : (
          <EmptyState title="조건에 맞는 문서가 없습니다" />
        )
      ) : (
        <DocumentTable documents={documents.data} />
      )}
      <CreateDocumentDialog
        key={projectId ?? "org"}
        open={creating && canCreate}
        projectId={projectId}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
        }}
      />
    </div>
  );
}

function DocumentTable({
  documents,
}: {
  readonly documents: readonly KnowledgeSummary[];
}) {
  return (
    <div className="incident-table knowledge-table">
      <div aria-hidden="true" className="incident-table-head">
        <span>문서</span>
        <span>종류</span>
        <span>상태</span>
        <span>작성자</span>
        <span>수정</span>
      </div>
      <ul aria-label="문서 목록">
        {documents.map((document) => (
          <li key={document.id}>
            <Link href={routes.doc(document.id)} className="incident-table-row">
              <span className="min-w-0 truncate font-medium">
                {document.title}{" "}
                <Badge>{document.project?.key ?? "조직"}</Badge>
              </span>
              <span>
                <KindLabel kind={document.kind} />
              </span>
              <span>
                <KnowledgeStatusLabel status={document.status} />
              </span>
              <span className="min-w-0 truncate text-sm">
                <span className="incident-table-label">작성 </span>
                {document.author?.name ?? "알 수 없음"}
              </span>
              <span className="text-sm text-muted tabular-nums">
                <span className="incident-table-label">수정 </span>
                {formatDate(document.updatedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
