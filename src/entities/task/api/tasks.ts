import { api } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";
import { queryOptions } from "@tanstack/react-query";
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
    return queryOptions({
      queryKey: [...taskKeys.all, "board", personal, params.toString()],
      queryFn: () => taskApi.board(params, personal),
      refetchInterval: BOARD_POLL_INTERVAL,
      gcTime: 0,
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
