import { api, normalizeApiError } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";
import { keepPreviousKey } from "@/shared/lib";
import { queryOptions, type QueryKey } from "@tanstack/react-query";
import type {
  CarryOver,
  CloseSprint,
  RetroEntry,
  RetroKind,
  Sprint,
  SprintInput,
  SprintReview,
} from "../model/types";

// 키는 프로젝트 키 아래에 둔다: 프로젝트 invalidate(멤버·PM 변경)가 Sprint 권한 표시도 갱신한다.
export const sprintKeys = {
  list: (projectId: string) => ["projects", projectId, "sprints"] as const,
  detail: (projectId: string, sprintId: string) =>
    ["projects", projectId, "sprints", sprintId] as const,
  carryOvers: (projectId: string, sprintId: string) =>
    ["projects", projectId, "sprints", sprintId, "carry-overs"] as const,
  review: (projectId: string, sprintId: string) =>
    ["projects", projectId, "sprints", sprintId, "review"] as const,
  retro: (projectId: string, sprintId: string) =>
    ["projects", projectId, "sprints", sprintId, "retro"] as const,
};

function base(projectId: string, sprintId?: string) {
  const root = `/api/v1/projects/${encodeURIComponent(projectId)}/sprints`;
  return sprintId ? `${root}/${encodeURIComponent(sprintId)}` : root;
}

export const sprintApi = {
  list: async (projectId: string) =>
    (await api.get<readonly Sprint[]>(base(projectId))).data,
  detail: async (projectId: string, sprintId: string) =>
    (await api.get<Sprint>(base(projectId, sprintId))).data,
  create: async (projectId: string, body: SprintInput) =>
    (
      await api.post<Sprint>(base(projectId), {
        ...body,
        goal: body.goal.trim() || null,
      })
    ).data,
  /** 목표 빈 문자열 = 지움(계약). */
  update: async (projectId: string, sprintId: string, body: SprintInput) =>
    (await api.patch<Sprint>(base(projectId, sprintId), body)).data,
  remove: async (projectId: string, sprintId: string) => {
    await api.delete(base(projectId, sprintId));
  },
  start: async (projectId: string, sprintId: string) =>
    (await api.post<Sprint>(`${base(projectId, sprintId)}/start`)).data,
  close: async (projectId: string, sprintId: string, body: CloseSprint) =>
    (
      await api.post<{
        readonly sprint: Sprint;
        readonly carryOvers: readonly CarryOver[];
      }>(`${base(projectId, sprintId)}/close`, body)
    ).data,
  addTasks: async (
    projectId: string,
    sprintId: string,
    taskIds: readonly string[],
  ) =>
    (
      await api.post<Sprint>(`${base(projectId, sprintId)}/tasks`, {
        taskIds,
      })
    ).data,
  removeTask: async (projectId: string, sprintId: string, taskId: string) => {
    await api.delete(
      `${base(projectId, sprintId)}/tasks/${encodeURIComponent(taskId)}`,
    );
  },
  carryOvers: async (projectId: string, sprintId: string) =>
    (
      await api.get<readonly CarryOver[]>(
        `${base(projectId, sprintId)}/carry-overs`,
      )
    ).data,
  /** 저장된 리뷰가 없거나 미게시 리뷰를 관리자가 아닌 사람이 보면 404 → null. */
  review: async (projectId: string, sprintId: string) => {
    try {
      return (
        await api.get<SprintReview>(`${base(projectId, sprintId)}/review`)
      ).data;
    } catch (error) {
      if (normalizeApiError(error).code === "SPRINT_REVIEW_NOT_FOUND")
        return null;
      throw error;
    }
  },
  reviewDraft: async (projectId: string, sprintId: string) =>
    (
      await api.get<{ readonly body: string; readonly generatedAt: string }>(
        `${base(projectId, sprintId)}/review/draft`,
      )
    ).data,
  saveReview: async (projectId: string, sprintId: string, body: string) =>
    (
      await api.put<SprintReview>(`${base(projectId, sprintId)}/review`, {
        body,
      })
    ).data,
  publishReview: async (projectId: string, sprintId: string) =>
    (
      await api.post<SprintReview>(
        `${base(projectId, sprintId)}/review/publish`,
      )
    ).data,
  retro: async (projectId: string, sprintId: string) =>
    (await api.get<readonly RetroEntry[]>(`${base(projectId, sprintId)}/retro`))
      .data,
  createRetro: async (
    projectId: string,
    sprintId: string,
    body: { readonly kind: RetroKind; readonly body: string },
  ) =>
    (await api.post<RetroEntry>(`${base(projectId, sprintId)}/retro`, body))
      .data,
  updateRetro: async (
    projectId: string,
    sprintId: string,
    entryId: string,
    body: { readonly body: string },
  ) =>
    (
      await api.patch<RetroEntry>(
        `${base(projectId, sprintId)}/retro/${encodeURIComponent(entryId)}`,
        body,
      )
    ).data,
  deleteRetro: async (projectId: string, sprintId: string, entryId: string) => {
    await api.delete(
      `${base(projectId, sprintId)}/retro/${encodeURIComponent(entryId)}`,
    );
  },
};

// 다른 Sprint로 옮길 때만 이전 데이터를 빌린다. 같은 키 캐시가 지워진 뒤(Sprint 삭제·권한 변경)에는 다시 그리지 않는다.
const polled = <K extends QueryKey>(queryKey: K) => ({
  queryKey,
  refetchInterval: BOARD_POLL_INTERVAL,
  placeholderData: keepPreviousKey(queryKey),
  retry: false,
});

export const sprintQueries = {
  list: (projectId: string) =>
    queryOptions({
      ...polled(sprintKeys.list(projectId)),
      queryFn: () => sprintApi.list(projectId),
    }),
  detail: (projectId: string, sprintId: string) =>
    queryOptions({
      ...polled(sprintKeys.detail(projectId, sprintId)),
      queryFn: () => sprintApi.detail(projectId, sprintId),
    }),
  carryOvers: (projectId: string, sprintId: string) =>
    queryOptions({
      ...polled(sprintKeys.carryOvers(projectId, sprintId)),
      queryFn: () => sprintApi.carryOvers(projectId, sprintId),
    }),
  review: (projectId: string, sprintId: string) =>
    queryOptions({
      ...polled(sprintKeys.review(projectId, sprintId)),
      queryFn: () => sprintApi.review(projectId, sprintId),
    }),
  retro: (projectId: string, sprintId: string) =>
    queryOptions({
      ...polled(sprintKeys.retro(projectId, sprintId)),
      queryFn: () => sprintApi.retro(projectId, sprintId),
    }),
};
