import { api } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";
import { keepPreviousKey } from "@/shared/lib";
import {
  queryOptions,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { boardRequestParams } from "../model/board";
import type {
  Board,
  CreateTask,
  MoveTask,
  TaskDetail,
  UpdateTask,
} from "../model/types";

export const taskKeys = {
  all: ["tasks"] as const,
  detail: (id: string) => ["tasks", "detail", id] as const,
  // 해당 프로젝트로 필터된 보드 쿼리만 고른다(전체 invalidate 회피).
  isProjectBoard: (key: QueryKey, projectKey: string) =>
    key[0] === "tasks" &&
    key[1] === "board" &&
    typeof key[3] === "string" &&
    (new URLSearchParams(key[3])
      .get("project")
      ?.split(",")
      .includes(projectKey) ??
      false),
};
export const taskApi = {
  board: async (params: URLSearchParams, personal: boolean) =>
    (
      await api.get<Board>(personal ? "/api/v1/me/board" : "/api/v1/board", {
        params,
      })
    ).data,
  detail: async (id: string) =>
    (await api.get<TaskDetail>(`/api/v1/tasks/${encodeURIComponent(id)}`)).data,
  create: async (body: CreateTask) =>
    (await api.post<TaskDetail>("/api/v1/tasks", body)).data,
  update: async (id: string, body: UpdateTask) =>
    (
      await api.patch<TaskDetail>(
        `/api/v1/tasks/${encodeURIComponent(id)}`,
        body,
      )
    ).data,
  move: async (id: string, body: MoveTask) =>
    (await api.patch(`/api/v1/tasks/${encodeURIComponent(id)}/position`, body))
      .data,
  delete: async (id: string) => {
    await api.delete(`/api/v1/tasks/${encodeURIComponent(id)}`);
  },
};

export const taskQueries = {
  board: (search: string, personal: boolean) => {
    const params = boardRequestParams(search);
    params.forEach((value, key) => {
      params.set(key, value.split(",").sort().join(","));
    });
    const queryKey = [...taskKeys.all, "board", personal, params.toString()];
    return queryOptions({
      queryKey,
      queryFn: () => taskApi.board(params, personal),
      refetchInterval: BOARD_POLL_INTERVAL,
      placeholderData: keepPreviousKey(queryKey),
      retry: false,
    });
  },
  detail: (id: string) =>
    queryOptions({
      queryKey: taskKeys.detail(id),
      queryFn: () => taskApi.detail(id),
      refetchInterval: BOARD_POLL_INTERVAL,
      gcTime: 0,
      retry: false,
    }),
};

/**
 * 업무 목록·개수를 담는 다른 슬라이스의 쿼리. 업무가 사라지면(404·권한 회수) 함께 정리한다.
 * 프로젝트(Sprint·확인 필요 포함) · 홈 · 내 리뷰 요청 · 팀원 부하.
 */
const taskListKeys: readonly QueryKey[] = [
  ["projects"],
  ["home"],
  ["me", "github", "review-requests"],
  ["members"],
];

/**
 * 업무 단건이 404·403이면 그 업무가 남아 있을 수 있는 캐시를 모두 정리한다.
 * - 404가 난 상세·GitHub 패널은 지운다(다시 받아도 같은 404를 되풀이할 뿐이다).
 * - 보드와 업무를 담는 목록은 화면에 없으면 지우고, 화면에 있으면(숨겨진 이전 화면 포함) 비운 뒤 다시 받는다.
 *   지우기만 하면 화면에 붙어 있는 구독자가 옛 결과를 다시 그린다.
 */
export function forgetTask(client: QueryClient) {
  client.removeQueries({
    queryKey: taskKeys.all,
    predicate: ({ queryKey }) =>
      queryKey[1] === "detail" || queryKey[1] === "github",
  });
  for (const queryKey of [taskKeys.all, ...taskListKeys]) {
    client.removeQueries({ queryKey, type: "inactive" });
    void client.resetQueries({ queryKey, type: "active" });
  }
}
