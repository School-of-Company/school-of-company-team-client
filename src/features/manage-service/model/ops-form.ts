import type { ServiceOps, UpdateServiceOps } from "@/entities/service";

/** 입력란 값(문자열). 숫자 칸을 비우면 서버 기본값(D17 3.2절)을 보낸다. */
export type OpsForm = {
  readonly healthEnabled: boolean;
  readonly url: string;
  readonly intervalSeconds: string;
  readonly timeoutMs: string;
  readonly expectedStatusMin: string;
  readonly expectedStatusMax: string;
  readonly allowHttp: boolean;
  readonly dashboardUrl: string;
  readonly logsUrl: string;
  readonly errorTrackerUrl: string;
  readonly runbookDocumentId: string;
  readonly sentryOrgSlug: string;
  readonly sentryProjectSlug: string;
};

const defaults = {
  intervalSeconds: 300,
  timeoutMs: 5000,
  expectedStatusMin: 200,
  expectedStatusMax: 399,
} as const;

export function opsToForm(ops: ServiceOps): OpsForm {
  const check = ops.healthCheck;
  return {
    healthEnabled: !!check,
    url: check?.url ?? "",
    intervalSeconds: String(check?.intervalSeconds ?? defaults.intervalSeconds),
    timeoutMs: String(check?.timeoutMs ?? defaults.timeoutMs),
    expectedStatusMin: String(
      check?.expectedStatusMin ?? defaults.expectedStatusMin,
    ),
    expectedStatusMax: String(
      check?.expectedStatusMax ?? defaults.expectedStatusMax,
    ),
    allowHttp: check?.allowHttp ?? false,
    dashboardUrl: ops.links.dashboardUrl ?? "",
    logsUrl: ops.links.logsUrl ?? "",
    errorTrackerUrl: ops.links.errorTrackerUrl ?? "",
    runbookDocumentId: ops.links.runbook?.id ?? "",
    sentryOrgSlug: ops.sentry.orgSlug ?? "",
    sentryProjectSlug: ops.sentry.projectSlug ?? "",
  };
}

const text = (value: string) => value.trim() || null;
const number = (value: string, fallback: number) => {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) ? parsed : fallback;
};

/** PUT 은 전체 교체라 모든 칸을 보낸다. 헬스체크를 끄면 healthCheck: null. 범위 판정은 서버가 한다. */
export function opsFormToRequest(form: OpsForm): UpdateServiceOps {
  return {
    healthCheck: form.healthEnabled
      ? {
          url: form.url.trim(),
          intervalSeconds: number(
            form.intervalSeconds,
            defaults.intervalSeconds,
          ),
          timeoutMs: number(form.timeoutMs, defaults.timeoutMs),
          expectedStatusMin: number(
            form.expectedStatusMin,
            defaults.expectedStatusMin,
          ),
          expectedStatusMax: number(
            form.expectedStatusMax,
            defaults.expectedStatusMax,
          ),
          allowHttp: form.allowHttp,
        }
      : null,
    dashboardUrl: text(form.dashboardUrl),
    logsUrl: text(form.logsUrl),
    errorTrackerUrl: text(form.errorTrackerUrl),
    runbookDocumentId: text(form.runbookDocumentId),
    sentryOrgSlug: text(form.sentryOrgSlug),
    sentryProjectSlug: text(form.sentryProjectSlug),
  };
}
