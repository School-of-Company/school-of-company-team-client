"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  serviceErrorMessage,
  serviceQueries,
  TierLabel,
  useServiceByKey,
  type ServiceDetail,
} from "@/entities/service";
import { isHeadAdmin } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { ArchiveService, EditServiceDialog } from "@/features/manage-service";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import { Badge, Button, ErrorState, StaleNotice } from "@/shared/ui";
import { ServiceOverview } from "./ServiceOverview";
import { ServiceReleases } from "./ServiceReleases";
import { ServiceDeployments } from "./ServiceDeployments";
import { ServiceRunbooks } from "./ServiceRunbooks";

const tabs = [
  { value: "overview", label: "개요" },
  { value: "releases", label: "릴리스" },
  { value: "deployments", label: "배포" },
  { value: "runbooks", label: "Runbook" },
] as const;
export type ServiceTab = (typeof tabs)[number]["value"];

export function ServiceDetailPage({
  serviceKey,
}: {
  readonly serviceKey: string;
}) {
  return (
    <AuthGuard require="work" fallback={<ServiceDetailSkeleton />}>
      {(user) => (
        <Suspense fallback={<ServiceDetailSkeleton />}>
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

/** 상세 머리글(경로, 제목, 등급 줄)과 탭 줄을 실제와 같은 줄 높이로 잡는다. 하드 새로고침에도 탭이 밀리지 않는다. */
export function ServiceDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="서비스를 불러오는 중"
      className="service-detail grid gap-5"
    >
      <header aria-hidden="true" className="page-header">
        <div className="min-w-0">
          <p className="board-breadcrumb">
            <span className="ui-skeleton-text">서비스 / 키</span>
          </p>
          <h1 className="task-title font-semibold">
            <span className="ui-skeleton-text">서비스 이름</span>
          </h1>
          <p className="mt-2 flex items-center">
            <span className="service-tier">
              <span className="ui-skeleton-text">2등급</span>
            </span>
          </p>
        </div>
      </header>
      <div aria-hidden="true" className="project-nav flex border-b">
        <span className="ui-nav-link flex items-center border-b-2 border-transparent">
          <span className="ui-skeleton-text">개요</span>
        </span>
      </div>
      <div aria-hidden="true" className="ui-empty" />
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
  if (lookup.pending || !detail.data) return <ServiceDetailSkeleton />;
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
      <header className="page-header">
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
      {tab === "runbooks" && <ServiceRunbooks service={service} />}
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
