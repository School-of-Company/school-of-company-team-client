import { api } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";
import { keepPreviousKey } from "@/shared/lib";
import { queryOptions } from "@tanstack/react-query";
import type { Milestone, MilestoneInput } from "../model/types";

export const milestoneKeys = {
  list: (projectId: string) => ["projects", projectId, "milestones"] as const,
};

function base(projectId: string, milestoneId?: string) {
  const root = `/api/v1/projects/${encodeURIComponent(projectId)}/milestones`;
  return milestoneId ? `${root}/${encodeURIComponent(milestoneId)}` : root;
}

export const milestoneApi = {
  list: async (projectId: string) =>
    (await api.get<readonly Milestone[]>(base(projectId))).data,
  create: async (projectId: string, input: MilestoneInput) =>
    (
      await api.post<Milestone>(base(projectId), {
        name: input.name,
        description: input.description.trim() || null,
        dueDate: input.dueDate || null,
      })
    ).data,
  /** 설명 빈 문자열 = 지움, 마감일 빈 값 = `clearDueDate`(계약). */
  update: async (
    projectId: string,
    milestoneId: string,
    input: MilestoneInput,
  ) =>
    (
      await api.patch<Milestone>(base(projectId, milestoneId), {
        name: input.name,
        description: input.description.trim(),
        ...(input.dueDate
          ? { dueDate: input.dueDate }
          : { clearDueDate: true }),
      })
    ).data,
  remove: async (projectId: string, milestoneId: string) => {
    await api.delete(base(projectId, milestoneId));
  },
};

export const milestoneQueries = {
  list: (projectId: string) =>
    queryOptions({
      queryKey: milestoneKeys.list(projectId),
      queryFn: () => milestoneApi.list(projectId),
      refetchInterval: BOARD_POLL_INTERVAL,
      placeholderData: keepPreviousKey(milestoneKeys.list(projectId)),
      retry: false,
    }),
};
