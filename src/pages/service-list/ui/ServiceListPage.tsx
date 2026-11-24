"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  kindLabels,
  OwnerList,
  serviceErrorMessage,
  serviceQueries,
  StaleNotice,
  TierLabel,
  type DependencyGraph as Graph,
  type ServiceSummary,
} from "@/entities/service";
import { isHeadAdmin } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { CreateServiceDialog } from "@/features/manage-service";
import { DependencyGraph } from "@/widgets/dependency-graph";
import { routes } from "@/shared/config";
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  Skeleton,
  Spinner,
} from "@/shared/ui";

export function ServiceListPage() {
  return (
    <AuthGuard require="work">
      {(user) => (
        <Suspense fallback={<Spinner label="서비스 불러오는 중" />}>
          <ServiceListContent canCreate={isHeadAdmin(user)} />
        </Suspense>
      )}
    </AuthGuard>
  );
}

function ServiceListContent({ canCreate }: { readonly canCreate: boolean }) {
  const router = useRouter();
  const pathname = usePathname() ?? routes.services;
  const search = useSearchParams();
  const view = search?.get("view") === "graph" ? "graph" : "list";
  const archived = view === "list" && search?.get("archived") === "1";
  const [creating, setCreating] = useState(false);
  const services = useQuery({
    ...serviceQueries.list(archived),
    enabled: view === "list",
  });
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
          <h1>서비스</h1>
          <p className="page-subtitle tabular-nums">
            {view === "graph"
              ? "서비스 간 의존관계"
              : services.data
                ? `${archived ? "아카이브" : "운영 중"} ${services.data.length}개`
                : services.isError
                  ? "서비스 집계를 불러오지 못했습니다"
                  : `${archived ? "아카이브" : "운영 중"} 서비스 집계 중`}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreating(true)}>
            <Icon name="plus" className="inline-block" /> 새 서비스
          </Button>
        )}
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="서비스 보기" className="settings-nav">
          <Link
            href={href({ view: null })}
            aria-current={view === "list" ? "page" : undefined}
          >
            목록
          </Link>
          <Link
            href={href({ view: "graph", archived: null })}
            aria-current={view === "graph" ? "page" : undefined}
          >
            의존관계
          </Link>
        </nav>
        {view === "list" && (
          <nav aria-label="보관 상태" className="settings-nav">
            <Link
              href={href({ archived: null })}
              aria-current={!archived ? "page" : undefined}
            >
              운영 중
            </Link>
            <Link
              href={href({ archived: "1" })}
              aria-current={archived ? "page" : undefined}
            >
              아카이브
            </Link>
          </nav>
        )}
      </div>
      {view === "graph" ? (
        <GraphView />
      ) : services.isPending ? (
        <div
          role="status"
          aria-label="서비스를 불러오는 중"
          className="grid gap-2"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      ) : !services.data ? (
        <ErrorState
          description={serviceErrorMessage(services.error)}
          onRetry={() => void services.refetch()}
        />
      ) : services.data.length === 0 ? (
        archived ? (
          <EmptyState title="아카이브된 서비스가 없습니다" />
        ) : (
          <EmptyState
            title="등록된 서비스가 없습니다"
            description={
              canCreate
                ? "운영하는 배포 단위를 서비스로 등록하고 소유자와 저장소를 정하세요."
                : "헤드 어드민이 서비스를 등록하면 여기에 나타납니다."
            }
          />
        )
      ) : (
        <>
          <StaleNotice query={services} />
          <ServiceTable services={services.data} />
        </>
      )}
      {canCreate && (
        <CreateServiceDialog
          open={creating}
          onClose={() => setCreating(false)}
          onCreated={(service) => {
            setCreating(false);
            router.push(routes.service(service.key));
          }}
        />
      )}
    </div>
  );
}

function ServiceTable({
  services,
}: {
  readonly services: readonly ServiceSummary[];
}) {
  return (
    <div className="service-table">
      <div aria-hidden="true" className="service-table-head">
        <span>서비스</span>
        <span>등급</span>
        <span>소유자</span>
        <span>저장소</span>
      </div>
      <ul aria-label="서비스 목록">
        {services.map((service) => (
          <li key={service.id}>
            <Link
              href={routes.service(service.key)}
              className="service-table-row"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {service.name}
                </span>
                <span className="block truncate text-xs text-muted">
                  {service.key}
                </span>
              </span>
              <span>
                <TierLabel tier={service.tier} />
              </span>
              <span className="min-w-0">
                <OwnerList owners={service.owners} compact />
              </span>
              <span className="text-sm text-muted tabular-nums">
                <span className="service-table-label">저장소 </span>
                {service.repositoryCount}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GraphView() {
  const graph = useQuery(serviceQueries.graph());
  if (graph.isPending)
    return (
      <div role="status" aria-label="의존관계를 불러오는 중">
        <Skeleton className="h-64" />
      </div>
    );
  if (!graph.data)
    return (
      <ErrorState
        description={serviceErrorMessage(graph.error)}
        onRetry={() => void graph.refetch()}
      />
    );
  if (graph.data.nodes.length === 0)
    return <EmptyState title="등록된 서비스가 없습니다" />;
  return (
    <div className="grid gap-6">
      <StaleNotice query={graph} />
      <DependencyGraph graph={graph.data} />
      <EdgeTable graph={graph.data} />
    </div>
  );
}

function EdgeTable({ graph }: { readonly graph: Graph }) {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const edges = graph.edges
    .map((edge) => ({
      ...edge,
      from: byId.get(edge.from),
      to: byId.get(edge.to),
    }))
    .filter((edge) => edge.from && edge.to)
    .sort((a, b) => (a.from?.key ?? "").localeCompare(b.from?.key ?? ""));
  return (
    <section aria-labelledby="edge-list" className="grid gap-2">
      <h2 id="edge-list" className="text-md font-semibold">
        의존 목록{" "}
        <span className="text-sm font-normal text-muted tabular-nums">
          {edges.length}
        </span>
      </h2>
      {edges.length === 0 ? (
        <p className="text-sm text-muted">
          아직 등록된 의존관계가 없습니다. 서비스 상세에서 추가합니다.
        </p>
      ) : (
        <table className="service-edge-table">
          <thead>
            <tr>
              <th scope="col">의존하는 서비스</th>
              <th scope="col">대상</th>
              <th scope="col">종류</th>
            </tr>
          </thead>
          <tbody>
            {edges.map((edge) => (
              <tr key={`${edge.from?.id}>${edge.to?.id}`}>
                <td>
                  <Link
                    href={routes.service(edge.from?.key ?? "")}
                    className="hover:underline"
                  >
                    {edge.from?.name}
                  </Link>
                  {edge.from?.archived && (
                    <span className="ml-2 text-xs text-muted">아카이브</span>
                  )}
                </td>
                <td>
                  <Link
                    href={routes.service(edge.to?.key ?? "")}
                    className="hover:underline"
                  >
                    {edge.to?.name}
                  </Link>
                  {edge.to?.archived && (
                    <span className="ml-2 text-xs text-muted">아카이브</span>
                  )}
                </td>
                <td>
                  <span className="service-kind" data-kind={edge.kind}>
                    {kindLabels[edge.kind]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
