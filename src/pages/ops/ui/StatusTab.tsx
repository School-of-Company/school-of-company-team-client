"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDateTime, SeverityLabel } from "@/entities/incident";
import {
  deploymentStatusLabels,
  HealthBadge,
  healthErrorLabel,
  opsQueries,
  sentrySummary,
  serviceErrorMessage,
  TierLabel,
  type OpsOverview,
  type OpsServiceRow,
} from "@/entities/service";
import { routes } from "@/shared/config";
import { settledData } from "@/shared/lib";
import {
  EmptyState,
  InfoTip,
  ListSkeleton,
  PageHeader,
  QueryState,
} from "@/shared/ui";
import { OpsTabs } from "./OpsTabs";

/** 운영 개요. 30초마다 조용히 다시 받고, 실패하면 마지막 값을 두고 StaleNotice 를 띄운다(QueryState). */
export function StatusTab() {
  const overview = useQuery(opsQueries.overview());
  const totals = settledData(overview)?.totals;
  return (
    <div className="grid gap-5">
      <PageHeader
        title={
          <>
            운영{" "}
            <InfoTip label="운영 설명">
              헬스체크나 모니터링이 다운을 알리면 장애가 자동으로 만들어져요.
            </InfoTip>
          </>
        }
        subtitle={
          totals
            ? `서비스 ${totals.services}개 중 정상 ${totals.up}개`
            : overview.isError && !overview.data
              ? "운영 상태를 불러오지 못했어요"
              : "운영 상태 집계 중"
        }
      />
      <OpsTabs active="status" />
      <OpsTotals totals={totals} />
      <QueryState
        query={overview}
        skeleton={
          <ListSkeleton label="운영 상태를 불러오는 중" rowClassName="h-16" />
        }
        errorMessage={serviceErrorMessage}
        isEmpty={(data) => data.services.length === 0}
        empty={
          <EmptyState
            title="등록된 서비스가 없어요"
            description="서비스 탭에서 서비스를 등록하고 헬스체크를 켜면 상태가 여기 보여요."
          />
        }
      >
        {(data) => <OpsTable services={data.services} />}
      </QueryState>
    </div>
  );
}

/** 집계 전에도 같은 칸을 그려 둔다(값만 "—"). 폴링으로 숫자가 바뀌어도 자리는 그대로다. */
function OpsTotals({
  totals,
}: {
  readonly totals: OpsOverview["totals"] | undefined;
}) {
  const items = [
    ["정상", totals?.up],
    ["불안정", totals?.degraded],
    ["다운", totals?.down],
    ["확인 안 됨", totals?.unknown],
    ["열린 장애", totals?.openIncidents],
    ["Sentry 미해결", totals?.sentryUnresolved],
  ] as const;
  return (
    <dl className="ops-totals" aria-label="운영 합계">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className="tabular-nums">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function OpsTable({
  services,
}: {
  readonly services: readonly OpsServiceRow[];
}) {
  return (
    <div className="ops-table">
      <div aria-hidden="true" className="ops-table-head">
        <span>서비스</span>
        <span>상태</span>
        <span>지연</span>
        <span>Sentry</span>
        <span>최근 배포</span>
        <span>열린 장애</span>
      </div>
      <ul aria-label="서비스 운영 상태">
        {services.map((service) => (
          <li key={service.id} className="ops-table-row">
            <span className="min-w-0">
              <Link
                href={`${routes.service(service.key)}?tab=monitoring`}
                className="block truncate font-medium hover:underline"
              >
                {service.name}
              </Link>
              <span className="flex min-w-0 items-center gap-2 text-xs text-muted">
                <span className="truncate">{service.key}</span>
                <TierLabel tier={service.tier} />
              </span>
            </span>
            <span className="min-w-0">
              <HealthBadge status={service.health.status} />
              <span className="block truncate text-xs text-muted">
                {service.health.lastErrorCode
                  ? healthErrorLabel(service.health.lastErrorCode)
                  : service.health.lastCheckedAt
                    ? `${formatDateTime(service.health.lastCheckedAt)} 확인`
                    : "검사 기록 없음"}
              </span>
            </span>
            <span className="text-sm tabular-nums">
              <span className="ops-table-label">지연 </span>
              {service.health.latencyMs !== null
                ? `${service.health.latencyMs}ms`
                : "—"}
            </span>
            <span className="min-w-0 truncate text-sm tabular-nums">
              <span className="ops-table-label">Sentry </span>
              {sentrySummary(service.sentry)}
            </span>
            <span className="min-w-0 text-sm">
              <span className="ops-table-label">최근 배포 </span>
              {service.lastDeploy ? (
                <LastDeploy deploy={service.lastDeploy} />
              ) : (
                <span className="text-muted">없음</span>
              )}
            </span>
            <span className="min-w-0 text-sm">
              <span className="ops-table-label">열린 장애 </span>
              {service.openIncident ? (
                <Link
                  href={routes.incident(service.openIncident.id)}
                  className="flex min-w-0 items-center gap-2 hover:underline"
                >
                  <SeverityLabel severity={service.openIncident.severity} />
                  <span className="truncate">{service.openIncident.title}</span>
                </Link>
              ) : (
                <span className="text-muted">없음</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LastDeploy({
  deploy,
}: {
  readonly deploy: NonNullable<OpsServiceRow["lastDeploy"]>;
}) {
  const text = `${deploy.environment} ${deploymentStatusLabels[deploy.status]}`;
  return (
    <span className="block min-w-0">
      {deploy.url ? (
        <a href={deploy.url} className="block truncate hover:underline">
          {text}
        </a>
      ) : (
        <span className="block truncate">{text}</span>
      )}
      <time
        dateTime={deploy.startedAt}
        className="block truncate text-xs text-muted tabular-nums"
      >
        {formatDateTime(deploy.startedAt)}
      </time>
    </span>
  );
}
