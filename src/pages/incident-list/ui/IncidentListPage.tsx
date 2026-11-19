"use client";

import Link from "next/link";
import { Suspense, useId, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  formatDateTime,
  formatDuration,
  impactMinutes,
  incidentErrorMessage,
  incidentQueries,
  IncidentStatusLabel,
  postmortemStatusLabels,
  SeverityLabel,
  type IncidentStatus,
  type IncidentSummary,
} from "@/entities/incident";
import { serviceQueries, StaleNotice } from "@/entities/service";
import { AuthGuard } from "@/features/auth";
import { IncidentFormDialog } from "@/features/manage-incident";
import { routes } from "@/shared/config";
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  Select,
  Skeleton,
  Spinner,
} from "@/shared/ui";

/** 목록 기본은 진행 중(대응 중·완화됨). 상태 묶음은 URL `?status=`에 둔다. */
const views = [
  { value: "active", label: "진행 중", statuses: ["OPEN", "MITIGATED"] },
  { value: "resolved", label: "해결됨", statuses: ["RESOLVED"] },
  { value: "all", label: "전체", statuses: [] },
] as const satisfies readonly {
  value: string;
  label: string;
  statuses: readonly IncidentStatus[];
}[];

export function IncidentListPage() {
  return (
    <AuthGuard require="work">
      {() => (
        <Suspense fallback={<Spinner label="사고 불러오는 중" />}>
          <IncidentListContent />
        </Suspense>
      )}
    </AuthGuard>
  );
}

function IncidentListContent() {
  const id = useId();
  const router = useRouter();
  const pathname = usePathname() ?? routes.incidents;
  const search = useSearchParams();
  const view =
    views.find((item) => item.value === search?.get("status")) ?? views[0];
  const serviceId = search?.get("service") ?? "";
  const [creating, setCreating] = useState(false);
  const incidents = useQuery(
    incidentQueries.list({ statuses: view.statuses, serviceId }),
  );
  const services = useQuery(serviceQueries.list(false));
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
          <h1>사고</h1>
          {incidents.data && (
            <p className="page-subtitle tabular-nums">
              {view.label} {incidents.data.length}건
            </p>
          )}
        </div>
        <Button onClick={() => setCreating(true)}>
          <Icon name="plus" className="inline-block" /> 사고 등록
        </Button>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="사고 상태" className="settings-nav">
          {views.map((item) => (
            <Link
              key={item.value}
              href={href({
                status: item.value === "active" ? null : item.value,
              })}
              aria-current={view.value === item.value ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {services.data && services.data.length > 0 && (
          <span className="flex items-center gap-2">
            <label htmlFor={`${id}-service`} className="text-sm text-muted">
              영향 서비스
            </label>
            <Select
              id={`${id}-service`}
              className="incident-filter-select"
              value={serviceId}
              onChange={(event) =>
                router.replace(href({ service: event.target.value || null }))
              }
            >
              <option value="">전체</option>
              {services.data.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </Select>
          </span>
        )}
      </div>
      {incidents.isPending ? (
        <div
          role="status"
          aria-label="사고를 불러오는 중"
          className="grid gap-2"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      ) : !incidents.data ? (
        <ErrorState
          description={incidentErrorMessage(incidents.error)}
          onRetry={() => void incidents.refetch()}
        />
      ) : incidents.data.length === 0 ? (
        view.value === "active" && !serviceId ? (
          <EmptyState
            title="진행 중인 사고가 없습니다"
            description="장애나 이상을 발견하면 바로 등록하고 대응 기록을 남기세요."
          />
        ) : (
          <EmptyState title="조건에 맞는 사고가 없습니다" />
        )
      ) : (
        <>
          <StaleNotice query={incidents} />
          <IncidentTable incidents={incidents.data} />
        </>
      )}
      <IncidentFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(incident) => {
          setCreating(false);
          router.push(routes.incident(incident.id));
        }}
      />
    </div>
  );
}

function IncidentTable({
  incidents,
}: {
  readonly incidents: readonly IncidentSummary[];
}) {
  return (
    <div className="incident-table">
      <div aria-hidden="true" className="incident-table-head">
        <span>사고</span>
        <span>심각도</span>
        <span>상태</span>
        <span>커맨더</span>
        <span>시작</span>
        <span>영향 시간</span>
      </div>
      <ul aria-label="사고 목록">
        {incidents.map((incident) => (
          <li key={incident.id}>
            <Link
              href={routes.incident(incident.id)}
              className="incident-table-row"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {incident.title}
                </span>
                <span className="block truncate text-xs text-muted">
                  {incident.services.length
                    ? incident.services
                        .map((service) => service.name)
                        .join(", ")
                    : "영향 서비스 없음"}
                  {incident.postmortemStatus &&
                    `, 사후 검토 ${postmortemStatusLabels[incident.postmortemStatus]}`}
                </span>
              </span>
              <span>
                <SeverityLabel severity={incident.severity} />
              </span>
              <span>
                <IncidentStatusLabel status={incident.status} />
              </span>
              <span className="min-w-0 truncate text-sm">
                <span className="incident-table-label">커맨더 </span>
                {incident.commander?.name ?? "없음"}
              </span>
              <span className="text-sm text-muted tabular-nums">
                <span className="incident-table-label">시작 </span>
                {formatDateTime(incident.startedAt)}
              </span>
              <span className="text-sm text-muted tabular-nums">
                <span className="incident-table-label">영향 </span>
                {formatDuration(impactMinutes(incident))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
