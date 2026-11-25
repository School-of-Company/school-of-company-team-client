import type { DeploymentStatus, ServiceTier } from "./types";

// 계약: 서버 docs/spec/s17-ops.md(feat/ops-v1). 조회는 팀원 누구나, 설정은 소유자 또는 LEAD(canEdit).

export type HealthStatus = "UP" | "DEGRADED" | "DOWN" | "UNKNOWN";
export type HealthErrorCode =
  "BLOCKED" | "TIMEOUT" | "UNREACHABLE" | "BAD_RESPONSE" | "UNEXPECTED_STATUS";
export type SentryStatus =
  "NOT_CONFIGURED" | "NOT_LINKED" | "PENDING" | "OK" | "ERROR";

export const healthStatusLabels: Readonly<Record<HealthStatus, string>> = {
  UP: "정상",
  // 지연이 길거나 최근 3회 중 실패가 섞인 경우(D17-1).
  DEGRADED: "불안정",
  DOWN: "다운",
  UNKNOWN: "확인 안 됨",
};
const healthErrorLabels: Readonly<Record<HealthErrorCode, string>> = {
  BLOCKED: "차단된 주소",
  TIMEOUT: "시간 초과",
  UNREACHABLE: "연결 실패",
  BAD_RESPONSE: "응답 해석 실패",
  UNEXPECTED_STATUS: "기대하지 않은 상태 코드",
};
/** 서버 DTO 는 문자열이라 모르는 코드는 그대로 보인다. */
export const healthErrorLabel = (code: string) =>
  healthErrorLabels[code as HealthErrorCode] ?? code;

export type HealthCheckConfig = {
  readonly url: string;
  readonly intervalSeconds: number;
  readonly timeoutMs: number;
  readonly expectedStatusMin: number;
  readonly expectedStatusMax: number;
  readonly allowHttp: boolean;
};

export type HealthState = {
  readonly status: HealthStatus;
  readonly latencyMs: number | null;
  readonly lastCheckedAt: string | null;
  readonly lastErrorCode: string | null;
};

export type HealthCheckRecord = {
  readonly checkedAt: string;
  readonly ok: boolean;
  readonly statusCode: number | null;
  readonly latencyMs: number | null;
  readonly errorCode: string | null;
};

export type SentryState = {
  readonly status: SentryStatus;
  readonly unresolvedCount: number | null;
  readonly events24h: number | null;
  readonly fetchedAt: string | null;
  readonly errorCode: string | null;
};

export type OpsIncident = {
  readonly id: string;
  readonly title: string;
  readonly severity: "SEV1" | "SEV2" | "SEV3";
  readonly status: "OPEN" | "MITIGATED" | "RESOLVED";
  readonly startedAt: string;
};

export type ServiceOps = {
  readonly serviceId: string;
  readonly healthCheck: HealthCheckConfig | null;
  readonly health: HealthState;
  /** 최근 20회, 최신 먼저. */
  readonly recentChecks: readonly HealthCheckRecord[];
  readonly links: {
    readonly dashboardUrl: string | null;
    readonly logsUrl: string | null;
    readonly errorTrackerUrl: string | null;
    readonly runbook: {
      readonly id: string;
      readonly title: string;
      readonly status: "DRAFT" | "PUBLISHED" | "DEPRECATED";
    } | null;
  };
  readonly sentry: SentryState & {
    readonly orgSlug: string | null;
    readonly projectSlug: string | null;
  };
  readonly webhook: {
    readonly configured: boolean;
    readonly rotatedAt: string | null;
    readonly path: string;
  };
  readonly openIncident: OpsIncident | null;
  readonly canEdit: boolean;
};

/** PUT 은 전체 교체다. 보내지 않은 칸은 서버가 지운다. */
export type UpdateServiceOps = {
  readonly healthCheck: HealthCheckConfig | null;
  readonly dashboardUrl: string | null;
  readonly logsUrl: string | null;
  readonly errorTrackerUrl: string | null;
  readonly runbookDocumentId: string | null;
  readonly sentryOrgSlug: string | null;
  readonly sentryProjectSlug: string | null;
};

export type WebhookSecret = {
  readonly secret: string;
  readonly path: string;
  readonly rotatedAt: string;
};

export type OpsLastDeploy = {
  readonly environment: string;
  readonly status: DeploymentStatus;
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly repositoryFullName: string;
  readonly url: string | null;
};

export type OpsServiceRow = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly tier: ServiceTier;
  readonly primaryOwner: {
    readonly userId: string;
    readonly name: string;
  } | null;
  readonly health: HealthState;
  readonly sentry: SentryState;
  readonly lastDeploy: OpsLastDeploy | null;
  readonly openIncident: OpsIncident | null;
};

export type OpsOverview = {
  readonly generatedAt: string;
  readonly totals: {
    readonly services: number;
    readonly up: number;
    readonly degraded: number;
    readonly down: number;
    readonly unknown: number;
    readonly openIncidents: number;
    readonly sentryUnresolved: number;
  };
  readonly services: readonly OpsServiceRow[];
};

/** Sentry 칸 한 줄. 수치가 없으면(토큰 없음, slug 없음, 아직 안 가져옴) 이유를 쓴다. */
export function sentrySummary(sentry: SentryState): string {
  switch (sentry.status) {
    case "NOT_CONFIGURED":
    case "NOT_LINKED":
      return "연결 안 됨";
    case "PENDING":
      return "가져오는 중";
    default: {
      const counts = `미해결 ${sentry.unresolvedCount ?? 0}, 24시간 ${sentry.events24h ?? 0}`;
      return sentry.status === "ERROR" ? `${counts} (갱신 실패)` : counts;
    }
  }
}

export type HealthCheckRun = {
  readonly check: HealthCheckRecord;
  /** 이 검사까지 반영한 상태. */
  readonly health: HealthState;
};

export type HealthBucket = {
  readonly start: string;
  readonly okCount: number;
  readonly failCount: number;
  /** 그 구간 성공 검사 지연의 중앙값. 성공이 없으면 null. */
  readonly p50LatencyMs: number | null;
};

/** 15분 구간 96개, 시각 오름차순, 빈 구간 포함(s17 3.7). */
export type HealthHistory = {
  readonly range: "24h";
  readonly from: string;
  readonly to: string;
  readonly bucketMinutes: number;
  readonly buckets: readonly HealthBucket[];
};

export type HealthBucketState = "EMPTY" | "OK" | "MIXED" | "FAIL";

export const bucketState = (bucket: HealthBucket): HealthBucketState =>
  bucket.failCount === 0
    ? bucket.okCount === 0
      ? "EMPTY"
      : "OK"
    : bucket.okCount === 0
      ? "FAIL"
      : "MIXED";

export function historySummary(history: HealthHistory) {
  let ok = 0;
  let failed = 0;
  let maxLatencyMs = 0;
  for (const bucket of history.buckets) {
    ok += bucket.okCount;
    failed += bucket.failCount;
    maxLatencyMs = Math.max(maxLatencyMs, bucket.p50LatencyMs ?? 0);
  }
  return { ok, failed, maxLatencyMs };
}
