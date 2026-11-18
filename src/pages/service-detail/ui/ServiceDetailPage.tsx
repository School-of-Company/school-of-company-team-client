"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  serviceErrorMessage,
  serviceQueries,
  StaleNotice,
  TierLabel,
  useServiceByKey,
  type ServiceDetail,
} from "@/entities/service";
import { isHeadAdmin } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { ArchiveService, EditServiceDialog } from "@/features/manage-service";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import { Badge, Button, ErrorState, Skeleton, Spinner } from "@/shared/ui";
import { ServiceOverview } from "./ServiceOverview";
import { ServiceReleases } from "./ServiceReleases";
import { ServiceDeployments } from "./ServiceDeployments";

const tabs = [
  { value: "overview", label: "개요" },
  { value: "releases", label: "릴리스" },
  { value: "deployments", label: "배포" },
] as const;
export type ServiceTab = (typeof tabs)[number]["value"];

export function ServiceDetailPage({
  serviceKey,
}: {
  readonly serviceKey: string;
}) {
  return (
    <AuthGuard require="work">
      {(user) => (
        <Suspense fallback={<Spinner label="서비스 불러오는 중" />}>
          <ServiceDetailContent
            key={serviceKey}
            serviceKey={serviceKey}
            headAdmin={isHeadAdmin(user)}
          />
        </Suspense>
      )}
    </AuthGuard>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="서비스를 불러오는 중" className="grid gap-4">
      <Skeleton className="w-24" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-64" />
    </div>
  );
}

function ServiceDetailContent({
  serviceKey,
  headAdmin,
}: {
  readonly serviceKey: string;
  readonly headAdmin: boolean;
}) {
  const lookup = useServiceByKey(serviceKey);
  const detail = useQuery({
    ...serviceQueries.detail(lookup.id ?? ""),
    enabled: !!lookup.id,
  });
  if (lookup.error)
    return (
      <ErrorState
        description={serviceErrorMessage(lookup.error)}
        onRetry={lookup.refetch}
      />
    );
  if (
    lookup.notFound ||
    (detail.error && normalizeApiError(detail.error).status === 404)
  )
    return (
      <ErrorState
        title="서비스를 찾을 수 없습니다"
        description="키가 바뀌지 않으므로 주소를 확인하거나 서비스 목록에서 다시 고르세요."
      />
    );
  if (!detail.data && detail.isError)
    return (
      <ErrorState
        description={serviceErrorMessage(detail.error)}
        onRetry={() => void detail.refetch()}
      />
    );
  if (lookup.pending || !detail.data) return <DetailSkeleton />;
  return (
    <>
      <StaleNotice query={detail} />
      <ServiceWorkspace service={detail.data} headAdmin={headAdmin} />
    </>
  );
}

function ServiceWorkspace({
  service,
  headAdmin,
}: {
  readonly service: ServiceDetail;
  readonly headAdmin: boolean;
}) {
  const pathname = usePathname() ?? routes.service(service.key);
  const search = useSearchParams();
  const tab: ServiceTab =
    tabs.find((item) => item.value === search?.get("tab"))?.value ?? "overview";
  const [editing, setEditing] = useState(false);
  return (
    <div className="service-detail grid gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="board-breadcrumb">
            <Link href={routes.services}>서비스</Link>
            <span aria-hidden="true">/</span>
            <span>{service.key}</span>
          </p>
          <h1 className="task-title font-semibold">{service.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <TierLabel tier={service.tier} />
            {service.archived && <Badge>아카이브됨</Badge>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {service.canEdit && (
            <Button
              variant="secondary"
              className="ui-button-sm"
              onClick={() => setEditing(true)}
            >
              수정
            </Button>
          )}
          {headAdmin && <ArchiveService service={service} />}
        </div>
      </header>
      <nav
        aria-label={`${service.name} 서비스 메뉴`}
        className="project-nav flex min-w-0 overflow-x-auto border-b"
      >
        {tabs.map((item) => (
          <Link
            key={item.value}
            href={
              item.value === "overview"
                ? pathname
                : `${pathname}?tab=${item.value}`
            }
            aria-current={tab === item.value ? "page" : undefined}
            className="ui-nav-link flex shrink-0 items-center border-b-2 border-transparent font-medium"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {tab === "overview" && <ServiceOverview service={service} />}
      {tab === "releases" && <ServiceReleases service={service} />}
      {tab === "deployments" && <ServiceDeployments service={service} />}
      {editing && (
        <EditServiceDialog
          service={service}
          open
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
