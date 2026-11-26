import type {
  RuleAction,
  RuleDisabledReason,
  RuleEvent,
  RuleScope,
} from "./rule";

// 계약: 서버 docs/spec/s23-automation-v3.md 8절(AutomationOverviewResponse). 헤드 어드민만 본다.
export type AutomationOverviewRule = {
  readonly id: string;
  readonly name: string;
  readonly scope: RuleScope;
  /** 팀 규칙이면 null. */
  readonly project: {
    readonly id: string;
    readonly key: string;
    readonly name: string;
  } | null;
  readonly event: RuleEvent;
  readonly action: RuleAction;
  readonly enabled: boolean;
  /** 만든 사람. 지워졌으면 null. */
  readonly owner: {
    readonly id: string;
    readonly name: string;
    readonly avatarUrl?: string | null;
  } | null;
  readonly lastRunAt: string | null;
  readonly succeeded7d: number;
  readonly failed7d: number;
  readonly skipped7d: number;
  readonly consecutiveFailures: number;
  readonly disabledReason: RuleDisabledReason | null;
  readonly disabledAt: string | null;
};

export type AutomationFailure = {
  readonly runId: string;
  readonly ruleId: string;
  readonly ruleName: string;
  readonly event: RuleEvent;
  readonly resultCode: string | null;
  readonly lastError: string | null;
  readonly finishedAt: string | null;
};

export type AutomationOverview = {
  readonly rules: readonly AutomationOverviewRule[];
  /** 최근 7일 실패 최대 20건, 최신순. 업무 제목은 없다. */
  readonly recentFailures: readonly AutomationFailure[];
};

export type OverviewFilter = {
  readonly scope: RuleScope | "";
  readonly projectId: string;
  readonly enabled: "" | "true" | "false";
  readonly autoDisabled: boolean;
  readonly event: RuleEvent | "";
  readonly action: RuleAction | "";
};

const SCOPES: readonly string[] = ["PROJECT", "TEAM"];

/** 필터는 주소에 둔다(AGENTS.md IA). 모르는 값은 버린다. */
export function overviewFilterFrom(params: {
  readonly get: (name: string) => string | null;
}): OverviewFilter {
  const scope = params.get("scope") ?? "";
  const enabled = params.get("enabled") ?? "";
  return {
    scope: SCOPES.includes(scope) ? (scope as RuleScope) : "",
    projectId: params.get("projectId") ?? "",
    enabled: enabled === "true" || enabled === "false" ? enabled : "",
    autoDisabled: params.get("autoDisabled") === "true",
    event: (params.get("event") ?? "") as RuleEvent | "",
    action: (params.get("action") ?? "") as RuleAction | "",
  };
}

/** 빈 값은 빼고 쿼리 문자열로. 기존 쿼리(탭 등)는 base 로 넘긴다. */
export function overviewFilterQuery(
  filter: OverviewFilter,
  base: Readonly<Record<string, string>> = {},
): string {
  const params = new URLSearchParams(base);
  const entries: readonly [string, string][] = [
    ["scope", filter.scope],
    ["projectId", filter.projectId],
    ["enabled", filter.enabled],
    ["autoDisabled", filter.autoDisabled ? "true" : ""],
    ["event", filter.event],
    ["action", filter.action],
  ];
  for (const [name, value] of entries)
    if (value) params.set(name, value);
    else params.delete(name);
  return params.toString();
}

/** 7일 성공률. 실행이 없으면 null(0% 로 보이지 않게). 건너뜀은 빼고 센다. */
export function successRate(rule: {
  readonly succeeded7d: number;
  readonly failed7d: number;
}): number | null {
  const total = rule.succeeded7d + rule.failed7d;
  return total === 0 ? null : Math.round((rule.succeeded7d / total) * 100);
}
