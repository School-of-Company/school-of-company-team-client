"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { projectAccess, projectQueries } from "@/entities/project";
import type { User } from "@/entities/user";
import { ProjectHeading, ProjectHeadingSkeleton } from "@/widgets/project-nav";
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
import { formatDate, settledData } from "@/shared/lib";
import {
  Button,
  Badge,
  ChipSelect,
  EmptyState,
  ErrorState,
  Icon,
  ListSkeleton,
  PageHeader,
  PageSkeleton,
  QueryState,
  SegmentedLinks,
} from "@/shared/ui";

/** 종류 필터가 있는 한 목록. 종류·상태는 URL `?type=`·`?status=`에 둔다(AGENTS.md). */
export function KnowledgeListPage() {
  return (
    <AuthGuard require="work">
      {(user) => (
        <Suspense fallback={<PageSkeleton label="문서 불러오는 중" />}>
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
    <AuthGuard require="work" fallback={<ProjectHeadingSkeleton />}>
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
  if (project.isPending) return <ProjectHeadingSkeleton />;
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
      <Suspense fallback={<PageSkeleton label="문서 불러오는 중" />}>
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
  // 목록이 오기 전에도 선택된 프로젝트 이름을 칩에 바로 보인다(상세 조회나 문서의 프로젝트에서 읽음).
  const projectOptions = (projects.data ?? []).map((project) => ({
    value: project.id,
    label: project.name,
  }));
  if (projectId && !projectOptions.some((option) => option.value === projectId))
    projectOptions.push({
      value: projectId,
      label:
        selectedProject.data?.name ??
        documents.data?.find((document) => document.project?.id === projectId)
          ?.project?.name ??
        "프로젝트 불러오는 중",
    });
  const count = settledData(documents)?.length;
  const kindLabel = kind ? kindLabels[kind] : "전체";
  return (
    <div className="grid gap-5">
      <PageHeader
        title="문서"
        subtitle={
          count !== undefined
            ? `${kindLabel} ${count}개`
            : documents.isError && !documents.data
              ? "문서 집계를 불러오지 못했습니다"
              : `${kindLabel} 문서 집계 중`
        }
        actions={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Icon name="plus" className="inline-block" /> 문서 만들기
            </Button>
          )
        }
      />
      <div className="page-toolbar">
        <SegmentedLinks
          label="문서 종류"
          items={[
            { href: href({ type: null }), label: "전체", active: !kind },
            ...knowledgeKinds.map((value) => ({
              href: href({ type: value }),
              label: kindLabels[value],
              active: kind === value,
            })),
          ]}
        />
        {!fixedProjectId && (
          <ChipSelect
            label="프로젝트"
            value={projectId ?? scope ?? ""}
            options={[
              { value: "", label: "모든 프로젝트" },
              { value: "ORG", label: "조직 문서" },
              ...projectOptions,
            ]}
            onChange={(value) =>
              router.replace(
                href({
                  projectId: value && value !== "ORG" ? value : null,
                  scope: value === "ORG" ? "ORG" : null,
                }),
              )
            }
          />
        )}
        <ChipSelect
          label="상태"
          value={status ?? ""}
          options={[
            { value: "", label: "모든 상태" },
            ...knowledgeStatuses.map((value) => ({
              value,
              label: knowledgeStatusLabels[value],
            })),
          ]}
          onChange={(value) => router.replace(href({ status: value || null }))}
        />
        {projects.isError && !fixedProjectId && (
          <span role="alert" className="text-sm text-danger">
            프로젝트 필터를 불러오지 못했습니다.{" "}
            <Button
              variant="ghost"
              className="ui-button-sm"
              onClick={() => void projects.refetch()}
            >
              다시 시도
            </Button>
          </span>
        )}
      </div>
      <QueryState
        query={documents}
        skeleton={
          <ListSkeleton label="문서를 불러오는 중" rowClassName="h-12" />
        }
        errorMessage={knowledgeErrorMessage}
        empty={
          !kind && !status ? (
            <EmptyState
              title="아직 문서가 없습니다"
              description="결정은 ADR, 제안은 RFC, 장애, 운영 대응 절차는 Runbook으로 남기세요."
            />
          ) : (
            <EmptyState title="조건에 맞는 문서가 없습니다" />
          )
        }
      >
        {(data) => <DocumentTable documents={data} />}
      </QueryState>
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
