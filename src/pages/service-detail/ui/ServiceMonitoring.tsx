"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDateTime, SeverityLabel } from "@/entities/incident";
import {
  HealthBadge,
  bucketState,
  healthErrorLabel,
  historySummary,
  opsQueries,
  sentrySummary,
  serviceErrorMessage,
  type ServiceDetail,
  type ServiceOps,
} from "@/entities/service";
import {
  OpsSettingsDialog,
  RunHealthCheck,
  WebhookPanel,
} from "@/features/manage-service";
import { routes } from "@/shared/config";
import { Button, ErrorState, ListSkeleton, StaleNotice } from "@/shared/ui";

/** 서비스 하나의 헬스체크, 최근 검사, 링크, Sentry, 업타임 웹훅. 설정은 소유자와 LEAD(canEdit)만. */
export function ServiceMonitoring({
  service,
  headAdmin,
}: {
  readonly service: ServiceDetail;
  readonly headAdmin: boolean;
}) {
  const ops = useQuery(opsQueries.service(service.id));
  if (ops.isPending)
    return <ListSkeleton label="모니터링 정보를 불러오는 중" rows={3} />;
  if (!ops.data)
    return (
      <ErrorState
        description={serviceErrorMessage(ops.error)}
        onRetry={() => void ops.refetch()}
      />
    );
  return (
    <div className="grid gap-6" aria-busy={ops.isFetching || undefined}>
      <StaleNotice query={ops} />
      <MonitoringBody
        serviceId={service.id}
        ops={ops.data}
        headAdmin={headAdmin}
      />
    </div>
  );
}

function MonitoringBody({
  serviceId,
  ops,
  headAdmin,
}: {
  readonly serviceId: string;
  readonly ops: ServiceOps;
  readonly headAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const { health } = ops;
  return (
    <>
      <section aria-labelledby="ops-health" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="ops-health">헬스체크</h2>
          {ops.canEdit && (
            <span className="flex flex-wrap items-center gap-2">
              {ops.healthCheck && <RunHealthCheck serviceId={serviceId} />}
              <Button
                variant="secondary"
                className="ui-button-sm"
                onClick={() => setEditing(true)}
              >
                설정 수정
              </Button>
            </span>
          )}
        </div>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <HealthBadge status={health.status} />
          <span className="tabular-nums">
            지연 {health.latencyMs !== null ? `${health.latencyMs}ms` : "—"}
          </span>
          <span className="text-muted">
            {health.lastCheckedAt
              ? `${formatDateTime(health.lastCheckedAt)} 확인`
              : "검사 기록 없음"}
          </span>
          {health.lastErrorCode && (
            <span className="text-muted">
              {healthErrorLabel(health.lastErrorCode)}
            </span>
          )}
        </p>
        <p className="text-sm text-muted">
          {ops.healthCheck
            ? `${ops.healthCheck.intervalSeconds}초마다 ${ops.healthCheck.url} 검사. 3회 연속 실패하면 다운으로 보고 장애를 만들어요.`
            : "헬스체크가 꺼져 있어요."}
        </p>
        {ops.openIncident && (
          <p className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">열린 장애</span>
            <SeverityLabel severity={ops.openIncident.severity} />
            <Link
              href={routes.incident(ops.openIncident.id)}
              className="min-w-0 truncate hover:underline"
            >
              {ops.openIncident.title}
            </Link>
          </p>
        )}
        <HealthChart serviceId={serviceId} />
      </section>
      <section aria-labelledby="ops-links" className="grid gap-3">
        <h2 id="ops-links">링크</h2>
        <dl className="ops-links">
          <LinkRow label="대시보드" href={ops.links.dashboardUrl} />
          <LinkRow label="로그" href={ops.links.logsUrl} />
          <LinkRow label="에러 추적" href={ops.links.errorTrackerUrl} />
          <div>
            <dt>Runbook</dt>
            <dd>
              {ops.links.runbook ? (
                <Link
                  href={routes.doc(ops.links.runbook.id)}
                  className="hover:underline"
                >
                  {ops.links.runbook.title}
                </Link>
              ) : (
                <span className="text-muted">없음</span>
              )}
            </dd>
          </div>
        </dl>
      </section>
      <section aria-labelledby="ops-sentry" className="grid gap-3">
        <h2 id="ops-sentry">Sentry</h2>
        <dl className="ops-links">
          <div>
            <dt>프로젝트</dt>
            <dd>
              {ops.sentry.orgSlug && ops.sentry.projectSlug ? (
                `${ops.sentry.orgSlug}/${ops.sentry.projectSlug}`
              ) : (
                <span className="text-muted">정하지 않음</span>
              )}
            </dd>
          </div>
          <div>
            <dt>이슈</dt>
            <dd className="tabular-nums">{sentrySummary(ops.sentry)}</dd>
          </div>
          {ops.sentry.fetchedAt && (
            <div>
              <dt>가져온 때</dt>
              <dd>{formatDateTime(ops.sentry.fetchedAt)}</dd>
            </div>
          )}
        </dl>
        {ops.sentry.status === "NOT_CONFIGURED" && (
          <p className="text-sm text-muted">
            서버에 Sentry 토큰이 없어요. 토큰을 넣으면 수치가 보여요.
          </p>
        )}
        {ops.sentry.status === "ERROR" && ops.sentry.errorCode && (
          <p className="text-sm text-muted">
            최근 갱신에 실패해서 마지막 수치를 보여 줘요. 오류 코드{" "}
            {ops.sentry.errorCode}
          </p>
        )}
      </section>
      <WebhookPanel serviceId={serviceId} ops={ops} />
      {editing && (
        <OpsSettingsDialog
          serviceId={serviceId}
          ops={ops}
          lead={headAdmin}
          open
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

function LinkRow({
  label,
  href,
}: {
  readonly label: string;
  readonly href: string | null;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="min-w-0 break-all">
        {href ? (
          <a href={href} className="hover:underline">
            {href}
          </a>
        ) : (
          <span className="text-muted">없음</span>
        )}
      </dd>
    </div>
  );
}

/**
 * 최근 24시간, 15분 구간 96개(빈 구간 포함). 성공만 있는 구간은 중앙값 지연만큼, 모두 실패면 통 막대,
 * 일부 실패면 틈으로 나뉜 막대, 기록이 없으면 바닥 선으로 색 없이 모양만으로도 구분한다. 개수는 요약 문장과 표로 읽힌다.
 */
function HealthChart({ serviceId }: { readonly serviceId: string }) {
  const history = useQuery(opsQueries.history(serviceId));
  const height = 48;
  const width = 6;
  if (!history.data)
    return history.isPending ? (
      <div aria-hidden="true" className="ops-chart-plot" />
    ) : (
      <p className="text-sm text-muted">24시간 기록을 불러오지 못했습니다.</p>
    );
  const { buckets } = history.data;
  const totals = historySummary(history.data);
  const summary =
    totals.ok + totals.failed === 0
      ? "최근 24시간 검사 기록이 없습니다"
      : `최근 24시간 검사 ${totals.ok + totals.failed}회 중 성공 ${totals.ok}회, 실패 ${totals.failed}회`;
  const recorded = buckets.filter((bucket) => bucketState(bucket) !== "EMPTY");
  const failBuckets = buckets.filter(
    (bucket) => bucketState(bucket) === "FAIL",
  ).length;
  const mixedBuckets = buckets.filter(
    (bucket) => bucketState(bucket) === "MIXED",
  ).length;
  const label =
    failBuckets + mixedBuckets === 0
      ? summary
      : `${summary}. 15분 구간 ${buckets.length}개 중 모두 실패 ${failBuckets}개, 일부 실패 ${mixedBuckets}개`;
  const gap = 4;
  return (
    <figure className="ops-chart grid gap-2">
      <StaleNotice query={history} />
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${buckets.length * width} ${height}`}
        preserveAspectRatio="none"
        className="ops-chart-plot"
      >
        {buckets.map((bucket, index) => {
          const state = bucketState(bucket);
          const x = index * width + 0.5;
          // 일부 실패 구간은 막대를 둘로 나눈다(아래 실패 몫, 사이 틈, 위 성공 몫). 모두 실패면 통 막대 하나.
          if (state === "MIXED") {
            const total = bucket.okCount + bucket.failCount;
            const fail = Math.max(
              8,
              Math.round((bucket.failCount / total) * (height - gap)),
            );
            return (
              <g key={bucket.start}>
                <rect
                  x={x}
                  y={height - fail}
                  width={width - 1}
                  height={fail}
                  className="ops-chart-bar"
                  data-state="MIXED"
                />
                <rect
                  x={x}
                  y={0}
                  width={width - 1}
                  height={Math.max(0, height - fail - gap)}
                  className="ops-chart-bar"
                  data-state="OK"
                />
              </g>
            );
          }
          const bar =
            state === "EMPTY"
              ? 2
              : state === "OK"
                ? Math.max(
                    6,
                    Math.round(
                      ((bucket.p50LatencyMs ?? 0) /
                        (totals.maxLatencyMs || 1)) *
                        height,
                    ),
                  )
                : height;
          return (
            <rect
              key={bucket.start}
              x={x}
              y={height - bar}
              width={width - 1}
              height={bar}
              className="ops-chart-bar"
              data-state={state}
            />
          );
        })}
      </svg>
      <figcaption className="text-xs text-muted">
        {label}. 15분 구간마다 성공은 지연 중앙값만큼, 모두 실패한 구간은 통
        막대, 일부 실패한 구간은 틈으로 나뉜 막대(아래가 실패 몫)로 그립니다.
      </figcaption>
      {recorded.length > 0 && (
        <details className="text-sm">
          <summary className="font-medium">표로 보기</summary>
          <table className="service-edge-table">
            <thead>
              <tr>
                <th scope="col">구간 시작</th>
                <th scope="col">성공</th>
                <th scope="col">실패</th>
                <th scope="col">지연 중앙값</th>
              </tr>
            </thead>
            <tbody>
              {[...recorded].reverse().map((bucket) => (
                <tr key={bucket.start}>
                  <td className="tabular-nums">
                    {formatDateTime(bucket.start)}
                  </td>
                  <td className="tabular-nums">{bucket.okCount}</td>
                  <td className="tabular-nums">{bucket.failCount}</td>
                  <td className="tabular-nums">
                    {bucket.p50LatencyMs !== null
                      ? `${bucket.p50LatencyMs}ms`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </figure>
  );
}
