"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDateTime, SeverityLabel } from "@/entities/incident";
import {
  HealthBadge,
  healthErrorLabels,
  healthHistory,
  opsQueries,
  sentrySummary,
  serviceErrorMessage,
  type ServiceDetail,
  type ServiceOps,
} from "@/entities/service";
import { OpsSettingsDialog, WebhookPanel } from "@/features/manage-service";
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
            <Button
              variant="secondary"
              className="ui-button-sm"
              onClick={() => setEditing(true)}
            >
              설정 수정
            </Button>
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
              {healthErrorLabels[health.lastErrorCode]}
            </span>
          )}
        </p>
        <p className="text-sm text-muted">
          {ops.healthCheck
            ? `${ops.healthCheck.url} 를 ${ops.healthCheck.intervalSeconds}초마다 검사합니다. 3회 연속 실패하면 다운이고, 다운이 되면 장애가 자동으로 만들어집니다.`
            : "헬스체크가 꺼져 있습니다. 주소를 정하면 서버가 주기적으로 검사합니다."}
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
        <HealthChart ops={ops} />
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
            서버에 Sentry 토큰이 없습니다(NOT_CONFIGURED). 운영자가 토큰을
            넣으면 수치가 나타납니다.
          </p>
        )}
        {ops.sentry.status === "ERROR" && ops.sentry.errorCode && (
          <p className="text-sm text-muted">
            최근 갱신에 실패했습니다({ops.sentry.errorCode}). 마지막으로 받은
            수치를 보여 줍니다.
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
 * 최근 검사(서버가 주는 최근 20회 중 24시간 안의 것). 성공은 지연에 비례한 막대, 실패는 꽉 찬 막대로
 * 모양이 다르다. 그림은 요약 문장으로 읽히고, 같은 내용을 표로도 볼 수 있다.
 */
function HealthChart({ ops }: { readonly ops: ServiceOps }) {
  const [now] = useState(() => Date.now());
  const history = healthHistory(ops.recentChecks, now);
  if (history.checks.length === 0) return null;
  const summary = `최근 24시간 검사 ${history.checks.length}회 중 성공 ${history.ok}회, 실패 ${history.failed}회${
    history.averageLatencyMs !== null
      ? `, 평균 지연 ${history.averageLatencyMs}ms`
      : ""
  }`;
  const width = 8;
  const height = 48;
  return (
    <figure className="ops-chart grid gap-2">
      <svg
        role="img"
        aria-label={summary}
        viewBox={`0 0 ${history.checks.length * width} ${height}`}
        preserveAspectRatio="none"
        className="ops-chart-plot"
      >
        {history.checks.map((check, index) => {
          const bar = check.ok
            ? Math.max(
                4,
                Math.round(
                  ((check.latencyMs ?? 0) / (history.maxLatencyMs || 1)) *
                    height,
                ),
              )
            : height;
          return (
            <rect
              key={check.checkedAt}
              x={index * width + 1}
              y={height - bar}
              width={width - 2}
              height={bar}
              className="ops-chart-bar"
              data-ok={check.ok}
            />
          );
        })}
      </svg>
      <figcaption className="text-xs text-muted">
        {summary}. 성공은 지연만큼, 실패는 꽉 찬 막대로 그립니다.
      </figcaption>
      <details className="text-sm">
        <summary className="font-medium">표로 보기</summary>
        <table className="service-edge-table">
          <thead>
            <tr>
              <th scope="col">시각</th>
              <th scope="col">결과</th>
              <th scope="col">상태 코드</th>
              <th scope="col">지연</th>
            </tr>
          </thead>
          <tbody>
            {[...history.checks].reverse().map((check) => (
              <tr key={check.checkedAt}>
                <td className="tabular-nums">
                  {formatDateTime(check.checkedAt)}
                </td>
                <td>
                  {check.ok
                    ? "성공"
                    : `실패${check.errorCode ? `, ${healthErrorLabels[check.errorCode]}` : ""}`}
                </td>
                <td className="tabular-nums">{check.statusCode ?? "—"}</td>
                <td className="tabular-nums">
                  {check.latencyMs !== null ? `${check.latencyMs}ms` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
