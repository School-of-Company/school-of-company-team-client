"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
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
import { serviceQueries } from "@/entities/service";
import { AuthGuard } from "@/features/auth";
import { IncidentFormDialog } from "@/features/manage-incident";
import { routes } from "@/shared/config";
import { settledData } from "@/shared/lib";
import {
  Button,
  ChipSelect,
  EmptyState,
  Icon,
  ListSkeleton,
  PageHeader,
  PageSkeleton,
  QueryState,
  SegmentedLinks,
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
        <Suspense fallback={<PageSkeleton label="장애 불러오는 중" />}>
          <IncidentListContent />
        </Suspense>
      )}
    </AuthGuard>
  );
}

function IncidentListContent() {
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
  const count = settledData(incidents)?.length;
  return (
    <div className="grid gap-5">
      <PageHeader
        title="장애"
        subtitle={
          count !== undefined
            ? `${view.label} ${count}건`
            : incidents.isError && !incidents.data
              ? "장애 집계를 불러오지 못했습니다"
              : `${view.label} 장애 집계 중`
        }
        actions={
          <Button onClick={() => setCreating(true)}>
            <Icon name="plus" className="inline-block" /> 장애 등록
          </Button>
        }
      />
      <div className="page-toolbar">
        <SegmentedLinks
          label="장애 상태"
          items={views.map((item) => ({
            href: href({
              status: item.value === "active" ? null : item.value,
            }),
            label: item.label,
            active: view.value === item.value,
          }))}
        />
        {services.data && services.data.length > 0 && (
          <ChipSelect
            label="영향 서비스"
            value={serviceId}
            options={[
              { value: "", label: "영향 서비스 전체" },
              ...services.data.map((service) => ({
                value: service.id,
                label: service.name,
              })),
            ]}
            onChange={(value) =>
              router.replace(href({ service: value || null }))
            }
          />
        )}
      </div>
      <QueryState
        query={incidents}
        skeleton={
          <ListSkeleton label="장애를 불러오는 중" rowClassName="h-16" />
        }
        errorMessage={incidentErrorMessage}
        empty={
          view.value === "active" && !serviceId ? (
            <EmptyState
              title="진행 중인 장애가 없습니다"
              description="장애나 이상을 발견하면 바로 등록하고 대응 기록을 남기세요."
            />
          ) : (
            <EmptyState title="조건에 맞는 장애가 없습니다" />
          )
        }
      >
        {(data) => <IncidentTable incidents={data} />}
      </QueryState>
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
        <span>장애</span>
        <span>심각도</span>
        <span>상태</span>
        <span>대응 책임자</span>
        <span>시작</span>
        <span>영향 시간</span>
      </div>
      <ul aria-label="장애 목록">
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
                <span className="incident-table-label">대응 책임자 </span>
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
