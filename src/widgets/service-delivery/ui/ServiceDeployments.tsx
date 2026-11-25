"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  deploymentStatusLabels,
  serviceErrorMessage,
  serviceQueries,
  type Deployment,
  type ServiceDetail,
} from "@/entities/service";
import { routes } from "@/shared/config";
import {
  EmptyState,
  ErrorState,
  Skeleton,
  ListSkeleton,
  StaleNotice,
} from "@/shared/ui";
import { formatDateTime, formatDuration, shortSha } from "./format";
import { HiddenRepositoriesNote } from "./ServiceReleases";
import { withParams } from "./href";

export function DeploymentsState({
  service,
  query,
  compact = false,
  children,
}: {
  readonly service: ServiceDetail;
  readonly query: UseQueryResult<readonly Deployment[]>;
  readonly compact?: boolean;
  readonly children: (items: readonly Deployment[]) => ReactNode;
}) {
  // 탭 본문은 빈 상태와 같은 높이에서 시작한다. 개요의 작은 칸만 짧은 줄 두 개.
  if (query.isPending && !compact)
    return (
      <ListSkeleton label="배포를 불러오는 중" rows={2} rowClassName="h-12" />
    );
  if (query.isPending)
    return (
      <div role="status" aria-label="배포를 불러오는 중" className="grid gap-2">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  if (!query.data)
    return (
      <ErrorState
        description={serviceErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  const visible =
    service.repositories.length === 0 ||
    service.repositories.some((repo) => repo.accessible);
  const workflowSet = service.repositories.some(
    (repo) => repo.deployWorkflowName,
  );
  const description =
    service.repositories.length === 0
      ? "이 서비스에 저장소를 연결하면 배포가 여기에 쌓입니다."
      : !visible
        ? "이 서비스의 저장소는 모두 비공개입니다. GitHub 원본 권한이 있어야 배포가 보입니다."
        : workflowSet
          ? "연결 이후의 배포부터 기록합니다. GitHub App이 deployment_status, workflow_run 이벤트를 구독하기 전에는 수집 대기 상태입니다."
          : "GitHub deployment 이벤트를 받거나, 저장소 배포 설정에 워크플로 이름을 정하면 그 실행을 배포로 기록합니다.";
  return (
    <>
      <StaleNotice query={query} />
      {query.data.length === 0 ? (
        compact ? (
          <p className="text-sm text-muted">
            {visible
              ? "기록된 배포가 없습니다."
              : "볼 수 있는 배포가 없습니다."}
          </p>
        ) : (
          <EmptyState
            title="기록된 배포가 없습니다"
            description={description}
          />
        )
      ) : (
        children(query.data)
      )}
      <HiddenRepositoriesNote service={service} what="배포" />
    </>
  );
}

export function DeploymentEntry({
  deployment,
}: {
  readonly deployment: Deployment;
}) {
  const duration = formatDuration(deployment.startedAt, deployment.finishedAt);
  return (
    <li className="deploy-entry" data-status={deployment.status}>
      <span className="deploy-marker" aria-hidden="true" />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="deploy-status font-medium">
            {deploymentStatusLabels[deployment.status]}
          </span>
          <span className="text-sm">{deployment.environment}</span>
          <code className="text-xs text-foreground-2">
            {shortSha(deployment.sha)}
          </code>
          {deployment.ref && (
            <span className="text-xs break-all text-muted">
              {deployment.ref}
            </span>
          )}
        </p>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span className="break-all">{deployment.repositoryFullName}</span>
          <time dateTime={deployment.startedAt}>
            {formatDateTime(deployment.startedAt)}
          </time>
          {duration ? (
            <span>{duration} 걸림</span>
          ) : (
            !deployment.finishedAt && <span>끝나지 않음</span>
          )}
          <span>
            {deployment.source === "WORKFLOW_RUN"
              ? "워크플로 실행"
              : "deployment 이벤트"}
          </span>
          {deployment.url && (
            <a
              href={deployment.url}
              className="underline hover:text-foreground"
            >
              GitHub에서 보기
            </a>
          )}
        </p>
      </div>
    </li>
  );
}

/** 최근 100건을 받아 환경별로 거른다. ponytail: 100건을 넘는 옛 이력은 서버 environment 파라미터로 바꿀 때 본다. */
export function ServiceDeployments({
  service,
}: {
  readonly service: ServiceDetail;
}) {
  const deployments = useQuery(serviceQueries.deployments(service.id));
  const search = useSearchParams();
  const pathname = usePathname() ?? routes.service(service.key);
  const environment = search?.get("env") ?? "";
  const environments = [
    ...new Set([
      ...service.repositories
        .filter((repo) => repo.accessible)
        .map((repo) => repo.deployEnvironment),
      ...(deployments.data ?? []).map((item) => item.environment),
    ]),
  ].sort();
  const href = (env: string) =>
    withParams(pathname, search, { env: env || null });
  return (
    <section aria-label="배포 이력" className="grid gap-4">
      {environments.length > 1 && (
        <nav aria-label="배포 환경" className="settings-nav">
          <Link
            href={href("")}
            aria-current={!environment ? "page" : undefined}
          >
            전체
          </Link>
          {environments.map((env) => (
            <Link
              key={env}
              href={href(env)}
              aria-current={environment === env ? "page" : undefined}
            >
              {env}
            </Link>
          ))}
        </nav>
      )}
      <DeploymentsState service={service} query={deployments}>
        {(items) => {
          const shown = environment
            ? items.filter((item) => item.environment === environment)
            : items;
          return shown.length === 0 ? (
            <EmptyState title={`${environment} 환경 배포가 없습니다`} />
          ) : (
            <ol className="deploy-timeline">
              {shown.map((deployment) => (
                <DeploymentEntry key={deployment.id} deployment={deployment} />
              ))}
            </ol>
          );
        }}
      </DeploymentsState>
    </section>
  );
}
