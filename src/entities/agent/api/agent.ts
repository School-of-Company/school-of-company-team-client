import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api";
import { keepPreviousKey } from "@/shared/lib";
import {
  activityParams,
  type ActivityFilters,
  type AdminApiToken,
  type AgentActivity,
  type AgentPolicy,
  type UpdateAgentPolicy,
} from "../model/policy";

export const agentKeys = {
  policy: ["agent-policy"] as const,
  adminTokens: ["admin", "tokens"] as const,
  activity: (scope: "me" | "admin", search: string) =>
    ["agent-activity", scope, search] as const,
  activityAll: ["agent-activity"] as const,
};

export const agentApi = {
  policy: async () => (await api.get<AgentPolicy>("/api/v1/agent-policy")).data,
  updatePolicy: async (body: UpdateAgentPolicy) =>
    (await api.put<AgentPolicy>("/api/v1/agent-policy", body)).data,
  adminTokens: async () =>
    (await api.get<readonly AdminApiToken[]>("/api/v1/admin/tokens")).data,
  revokeAnyToken: async (id: string) => {
    await api.delete(`/api/v1/admin/tokens/${encodeURIComponent(id)}`);
  },
  activity: async (scope: "me" | "admin", params: URLSearchParams) =>
    (
      await api.get<readonly AgentActivity[]>(
        scope === "me"
          ? "/api/v1/me/agent-activity"
          : "/api/v1/admin/agent-activity",
        { params },
      )
    ).data,
};

export const agentQueries = {
  policy: () =>
    queryOptions({ queryKey: agentKeys.policy, queryFn: agentApi.policy }),
  adminTokens: () =>
    queryOptions({
      queryKey: agentKeys.adminTokens,
      queryFn: agentApi.adminTokens,
    }),
  activity: (scope: "me" | "admin", filters: ActivityFilters) => {
    const params = activityParams(
      scope === "me" ? { ...filters, userId: undefined } : filters,
    );
    const key = agentKeys.activity(scope, params.toString());
    return queryOptions({
      queryKey: key,
      queryFn: () => agentApi.activity(scope, params),
      placeholderData: keepPreviousKey(key),
    });
  },
};
