import { api } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";
import { keepPreviousKey } from "@/shared/lib";
import {
  queryOptions,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { boardRequestParams } from "../model/board";
import { withoutTask } from "../model/without-task";
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
 * 업무 목록·개수와 저장소 목록을 담는 다른 슬라이스의 쿼리. 업무가 사라지면(404·권한 회수) 함께 정리한다.
 * 프로젝트(Sprint·확인 필요·발행 저장소 포함) · 홈 · 내 리뷰 요청 · 팀원 부하 · 설정의 연결·설치 저장소.
 */
const taskListKeys: readonly QueryKey[] = [
  ["projects"],
  ["home"],
  ["me", "github", "review-requests"],
  ["members"],
  ["settings-repositories"],
  ["settings-installable-repositories"],
];

const goneKey = (taskId: string) => ["gone-task", taskId] as const;

/**
 * 업무 단건이 404·403이면 그 업무가 남아 있을 수 있는 캐시를 정리한다. **업무당 한 번**(QueryClient 단위 표시라
 * 컴포넌트가 다시 마운트돼도 되풀이하지 않고, 세션이 바뀌어 캐시가 비면 표시도 사라진다).
 * - 404가 난 그 업무의 상세·GitHub 패널 쿼리는 건드리지 않는다(오류 상태 그대로, 다시 받지 않는다).
 * - 화면에 없는 목록은 지운다(돌아왔을 때 옛 목록을 그리지 않는다).
 * - 화면에 있는 목록은 그 업무를 바로 빼고 이전 데이터를 둔 채 다시 받는다. 비우지(reset) 않으므로 보드·프로젝트
 *   화면이 로딩으로 바뀌어 상세 패널이 언마운트되는 일이 없다.
 * 정리했으면 true.
 */
export function forgetTask(client: QueryClient, taskId: string) {
  if (client.getQueryData(goneKey(taskId))) return false;
  client.setQueryDefaults(["gone-task"], { gcTime: Infinity });
  client.setQueryData(goneKey(taskId), true);
  const others = ({ queryKey }: { readonly queryKey: QueryKey }) =>
    !(
      queryKey[0] === "tasks" &&
      (queryKey[1] === "detail" || queryKey[1] === "github") &&
      queryKey[2] === taskId
    );
  for (const queryKey of [taskKeys.all, ...taskListKeys]) {
    client.removeQueries({ queryKey, type: "inactive", predicate: others });
    client.setQueriesData(
      { queryKey, type: "active", predicate: others },
      (data: unknown) => withoutTask(data, taskId),
    );
    void client.invalidateQueries({
      queryKey,
      type: "active",
      predicate: others,
    });
  }
  return true;
}

/** 그 업무를 다시 읽을 수 있게 되면(다시 시도 성공) 정리 표시를 지운다. 다음에 사라지면 다시 정리한다. */
export function rememberTask(client: QueryClient, taskId: string) {
  client.removeQueries({ queryKey: goneKey(taskId), exact: true });
}
