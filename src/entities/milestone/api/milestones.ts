import { api } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";
import { keepPreviousKey } from "@/shared/lib";
import { queryOptions } from "@tanstack/react-query";
import {
  createMilestoneBody,
  updateMilestoneBody,
  type Milestone,
  type MilestoneInput,
} from "../model/types";

export type MilestoneView = "list" | "roadmap";

export const milestoneKeys = {
  list: (projectId: string) => ["projects", projectId, "milestones"] as const,
  /** 마일스톤 화면의 보기(목록, 로드맵). 보드 선택지는 `list`를 쓴다. */
  view: (projectId: string, view: MilestoneView) =>
    ["projects", projectId, "milestones", view] as const,
  detail: (projectId: string, milestoneId: string) =>
    ["projects", projectId, "milestones", "detail", milestoneId] as const,
};

function base(projectId: string, milestoneId?: string) {
  const root = `/api/v1/projects/${encodeURIComponent(projectId)}/milestones`;
  return milestoneId ? `${root}/${encodeURIComponent(milestoneId)}` : root;
}
const sprintPath = (projectId: string, milestoneId: string, sprintId: string) =>
  `${base(projectId, milestoneId)}/sprints/${encodeURIComponent(sprintId)}`;

export const milestoneApi = {
  list: async (projectId: string) =>
    (await api.get<readonly Milestone[]>(base(projectId))).data,
  roadmap: async (projectId: string) =>
    (
      await api.get<readonly Milestone[]>(base(projectId), {
        params: { view: "roadmap" },
      })
    ).data,
  detail: async (projectId: string, milestoneId: string) =>
    (await api.get<Milestone>(base(projectId, milestoneId))).data,
  create: async (projectId: string, input: MilestoneInput) =>
    (await api.post<Milestone>(base(projectId), createMilestoneBody(input)))
      .data,
  update: async (
    projectId: string,
    milestoneId: string,
    input: MilestoneInput,
    previous: MilestoneInput,
  ) =>
    (
      await api.patch<Milestone>(
        base(projectId, milestoneId),
        updateMilestoneBody(input, previous),
      )
    ).data,
  remove: async (projectId: string, milestoneId: string) => {
    await api.delete(base(projectId, milestoneId));
  },
  linkSprint: async (
    projectId: string,
    milestoneId: string,
    sprintId: string,
  ) =>
    (await api.put<Milestone>(sprintPath(projectId, milestoneId, sprintId)))
      .data,
  unlinkSprint: async (
    projectId: string,
    milestoneId: string,
    sprintId: string,
  ) =>
    (await api.delete<Milestone>(sprintPath(projectId, milestoneId, sprintId)))
      .data,
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
  view: (projectId: string, view: MilestoneView) =>
    queryOptions({
      queryKey: milestoneKeys.view(projectId, view),
      queryFn: () =>
        view === "roadmap"
          ? milestoneApi.roadmap(projectId)
          : milestoneApi.list(projectId),
      refetchInterval: BOARD_POLL_INTERVAL,
      // 목록 ↔ 로드맵 전환 동안 이전 결과를 흐리게 둔다.
      placeholderData: keepPreviousKey(milestoneKeys.view(projectId, view)),
      retry: false,
    }),
  // id가 키라 이전 대상을 빌려 그리지 않는다(design.md).
  detail: (projectId: string, milestoneId: string) =>
    queryOptions({
      queryKey: milestoneKeys.detail(projectId, milestoneId),
      queryFn: () => milestoneApi.detail(projectId, milestoneId),
      refetchInterval: BOARD_POLL_INTERVAL,
      retry: false,
    }),
};
