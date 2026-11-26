import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api, ApiError } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";
import { keepPreviousKey } from "@/shared/lib";
import {
  stripWebhookSecret,
  toggleRequest,
  type AutomationRule,
  type RulePreview,
  type RuleRunPage,
  type RuleRunStatus,
  type RuleTemplate,
  type SaveRuleRequest,
} from "../model/rule";
import type { AutomationOverview, OverviewFilter } from "../model/overview";

/** 규칙이 사는 곳: 프로젝트 규칙(프로젝트 ADMIN) 또는 팀 규칙(헤드 어드민, s23 3.1). */
export type RuleTarget =
  | { readonly scope: "PROJECT"; readonly projectId: string }
  | { readonly scope: "TEAM" };

const project = (projectId: string) =>
  `/api/v1/projects/${encodeURIComponent(projectId)}`;
function rulesPath(target: RuleTarget) {
  return target.scope === "TEAM"
    ? "/api/v1/team-rules"
    : `${project(target.projectId)}/rules`;
}
function rulePath(target: RuleTarget, ruleId: string) {
  return `${rulesPath(target)}/${encodeURIComponent(ruleId)}`;
}
function runsPath(target: RuleTarget) {
  return target.scope === "TEAM"
    ? "/api/v1/team-rule-runs"
    : `${project(target.projectId)}/rule-runs`;
}
function targetKey(target: RuleTarget) {
  return target.scope === "TEAM" ? "@team" : target.projectId;
}

export type RunFilter = {
  readonly ruleId: string;
  readonly status: RuleRunStatus | "";
};

export const ruleKeys = {
  root: ["automation"] as const,
  all: (target: RuleTarget) => ["automation", targetKey(target)] as const,
  rules: (target: RuleTarget) =>
    ["automation", targetKey(target), "rules"] as const,
  runs: (target: RuleTarget, filter: RunFilter) =>
    [
      "automation",
      targetKey(target),
      "runs",
      filter.ruleId,
      filter.status,
    ] as const,
  templates: () => ["automation", "rule-templates"] as const,
  overview: (filter: OverviewFilter) =>
    ["automation", "@overview", filter] as const,
};

/** 목록에는 비밀값을 두지 않는다. 서버도 목록에는 늘 null 을 주지만 한 번 더 뗀다. */
async function fetchRules(target: RuleTarget) {
  const { data } = await api.get<readonly AutomationRule[]>(rulesPath(target));
  return data.map((rule) => stripWebhookSecret(rule).value);
}

export const ruleQueries = {
  rules: (target: RuleTarget) =>
    queryOptions({
      queryKey: ruleKeys.rules(target),
      queryFn: () => fetchRules(target),
      refetchInterval: BOARD_POLL_INTERVAL,
      retry: false,
    }),
  runs: (target: RuleTarget, filter: RunFilter) =>
    infiniteQueryOptions({
      queryKey: ruleKeys.runs(target, filter),
      queryFn: async ({ pageParam }) =>
        (
          await api.get<RuleRunPage>(runsPath(target), {
            params: {
              ruleId: filter.ruleId || undefined,
              status: filter.status || undefined,
              before: pageParam || undefined,
              limit: 30,
            },
          })
        ).data,
      initialPageParam: "",
      getNextPageParam: (page) => page.nextBefore ?? undefined,
      refetchInterval: BOARD_POLL_INTERVAL,
      // 필터를 바꾸는 동안 이전 목록을 두어 깜빡이지 않게 한다.
      placeholderData: keepPreviousData,
      retry: false,
    }),
  overview: (filter: OverviewFilter) =>
    queryOptions({
      queryKey: ruleKeys.overview(filter),
      queryFn: async () =>
        (
          await api.get<AutomationOverview>("/api/v1/automation/overview", {
            params: {
              scope: filter.scope || undefined,
              projectId: filter.projectId || undefined,
              enabled: filter.enabled || undefined,
              autoDisabled: filter.autoDisabled || undefined,
              event: filter.event || undefined,
              action: filter.action || undefined,
            },
          })
        ).data,
      refetchInterval: BOARD_POLL_INTERVAL,
      placeholderData: keepPreviousKey(["automation", "@overview"]),
      retry: false,
    }),
};

/** 내장 템플릿은 서버 고정 목록이라 한 번 읽으면 다시 읽지 않는다. */
export const ruleTemplatesQuery = queryOptions({
  queryKey: ruleKeys.templates(),
  queryFn: async () =>
    (await api.get<readonly RuleTemplate[]>("/api/v1/rule-templates")).data,
  staleTime: Infinity,
  retry: false,
});

/**
 * 저장하지 않고 지난 14일 계기에 걸렸을지 본다. 서버는 아무것도 쓰지 않는다.
 * 팀 규칙은 고른 프로젝트 하나를 기준으로 본다(projectId 필수).
 */
export function useRulePreview(target: RuleTarget) {
  return useMutation({
    mutationFn: async (input: {
      readonly body: SaveRuleRequest;
      readonly projectId?: string;
    }) =>
      (
        await api.post<RulePreview>(
          `${rulesPath(target)}/preview`,
          input.body,
          target.scope === "TEAM"
            ? { params: { projectId: input.projectId } }
            : undefined,
        )
      ).data,
  });
}

export type RuleChange =
  | { readonly kind: "create"; readonly body: SaveRuleRequest }
  | {
      readonly kind: "update";
      readonly ruleId: string;
      readonly body: SaveRuleRequest;
    }
  | { readonly kind: "delete"; readonly ruleId: string };

/**
 * 생성·수정 결과는 { rule, secret } 이다. 웹훅 비밀값(생성 또는 WEBHOOK 으로 바꾼 저장에서만 온다)은
 * 규칙에서 떼어 호출한 화면에만 넘긴다. 화면은 받은 즉시 reset() 으로 뮤테이션 결과를 비운다.
 */
export function useRuleChange(target: RuleTarget) {
  const client = useQueryClient();
  const key = ruleKeys.rules(target);
  return useMutation({
    mutationFn: async (change: RuleChange) => {
      switch (change.kind) {
        case "create": {
          const { data } = await api.post<AutomationRule>(
            rulesPath(target),
            change.body,
          );
          const { value, secret } = stripWebhookSecret(data);
          return { rule: value, secret };
        }
        case "update": {
          const { data } = await api.put<AutomationRule>(
            rulePath(target, change.ruleId),
            change.body,
          );
          const { value, secret } = stripWebhookSecret(data);
          return { rule: value, secret };
        }
        case "delete":
          await api.delete(rulePath(target, change.ruleId));
          return null;
      }
    },
    onMutate: async (change) => {
      // 켜기·끄기와 삭제는 먼저 반영하고, 실패하면 되돌린다. 생성·수정은 서버 검증(이름 중복 등)을 기다린다.
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<readonly AutomationRule[]>(key);
      if (previous && change.kind === "delete")
        client.setQueryData(
          key,
          previous.filter((rule) => rule.id !== change.ruleId),
        );
      if (previous && change.kind === "update")
        client.setQueryData(
          key,
          previous.map((rule) =>
            rule.id === change.ruleId
              ? { ...rule, enabled: change.body.enabled }
              : rule,
          ),
        );
      return { previous };
    },
    onError: (_error, _change, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
    },
    onSettled: () =>
      // 삭제하면 실행 기록도 함께 지워지고, 켜고 끄면 운영 개요도 바뀐다.
      client.invalidateQueries({ queryKey: ruleKeys.root }),
  });
}

/** 웹훅 비밀값 재발급. 이전 값은 바로 무효다. 결과는 화면 상태로만 넘기고 reset() 한다. */
export function useRotateWebhookSecret(target: RuleTarget) {
  return useMutation({
    mutationFn: async (ruleId: string) =>
      (
        await api.post<{ readonly webhookSecret: string }>(
          `${rulePath(target, ruleId)}/webhook-secret`,
        )
      ).data.webhookSecret,
  });
}

/**
 * 운영 개요에서 자동으로 꺼진 규칙을 다시 켠다. 켜기 엔드포인트가 없어 정의 전체를 읽어 PUT 한다.
 * 다시 켜면 서버가 연속 실패 수와 자동 끔 이유를 지운다(D23-12).
 */
export function useReEnableRule() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      readonly ruleId: string;
      readonly target: RuleTarget;
    }) => {
      const rule = (await fetchRules(input.target)).find(
        (item) => item.id === input.ruleId,
      );
      if (!rule) throw new ApiError(404, "RULE_NOT_FOUND", "");
      await api.put(
        rulePath(input.target, input.ruleId),
        toggleRequest(rule, true),
      );
    },
    onSettled: () => client.invalidateQueries({ queryKey: ruleKeys.root }),
  });
}
