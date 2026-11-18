import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";
import type {
  AutomationRule,
  RuleRunPage,
  RuleRunStatus,
  SaveRuleRequest,
} from "../model/rule";

const base = (projectId: string) =>
  `/api/v1/projects/${encodeURIComponent(projectId)}`;

export type RunFilter = {
  readonly ruleId: string;
  readonly status: RuleRunStatus | "";
};

export const ruleKeys = {
  all: (projectId: string) => ["automation", projectId] as const,
  rules: (projectId: string) => ["automation", projectId, "rules"] as const,
  runs: (projectId: string, filter: RunFilter) =>
    ["automation", projectId, "runs", filter.ruleId, filter.status] as const,
};

export const ruleQueries = {
  rules: (projectId: string) =>
    queryOptions({
      queryKey: ruleKeys.rules(projectId),
      queryFn: async () =>
        (await api.get<readonly AutomationRule[]>(`${base(projectId)}/rules`))
          .data,
      refetchInterval: BOARD_POLL_INTERVAL,
      retry: false,
    }),
  runs: (projectId: string, filter: RunFilter) =>
    infiniteQueryOptions({
      queryKey: ruleKeys.runs(projectId, filter),
      queryFn: async ({ pageParam }) =>
        (
          await api.get<RuleRunPage>(`${base(projectId)}/rule-runs`, {
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
};

export type RuleChange =
  | { readonly kind: "create"; readonly body: SaveRuleRequest }
  | {
      readonly kind: "update";
      readonly ruleId: string;
      readonly body: SaveRuleRequest;
    }
  | { readonly kind: "delete"; readonly ruleId: string };

export function useRuleChange(projectId: string) {
  const client = useQueryClient();
  const key = ruleKeys.rules(projectId);
  return useMutation({
    mutationFn: async (change: RuleChange) => {
      switch (change.kind) {
        case "create":
          return (
            await api.post<AutomationRule>(
              `${base(projectId)}/rules`,
              change.body,
            )
          ).data;
        case "update":
          return (
            await api.put<AutomationRule>(
              `${base(projectId)}/rules/${encodeURIComponent(change.ruleId)}`,
              change.body,
            )
          ).data;
        case "delete":
          await api.delete(
            `${base(projectId)}/rules/${encodeURIComponent(change.ruleId)}`,
          );
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
      // 삭제하면 실행 기록도 함께 지워진다.
      client.invalidateQueries({ queryKey: ruleKeys.all(projectId) }),
  });
}
