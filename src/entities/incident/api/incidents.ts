import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";
import type {
  ActionItem,
  ChangeIncidentStatus,
  CreateActionItemTask,
  CreateIncident,
  Discussion,
  IncidentDetail,
  IncidentStatus,
  IncidentSummary,
  Postmortem,
  PostmortemSections,
  TimelineEntry,
  UpdateIncident,
  UpdatePostmortem,
} from "../model/types";

const path = (id: string) => `/api/v1/incidents/${encodeURIComponent(id)}`;

export type IncidentFilter = {
  readonly statuses: readonly IncidentStatus[];
  readonly serviceId?: string;
};

export const incidentKeys = {
  all: ["incidents"] as const,
  list: (filter: IncidentFilter) =>
    [
      "incidents",
      "list",
      [...filter.statuses].sort().join(","),
      filter.serviceId ?? "",
    ] as const,
  detail: (id: string) => ["incidents", "detail", id] as const,
  postmortem: (id: string) => ["incidents", "postmortem", id] as const,
};

export const incidentApi = {
  list: async (filter: IncidentFilter) =>
    (
      await api.get<readonly IncidentSummary[]>("/api/v1/incidents", {
        params: {
          status: filter.statuses.length ? filter.statuses.join(",") : undefined,
          serviceId: filter.serviceId || undefined,
          limit: 200,
        },
      })
    ).data,
  detail: async (id: string) =>
    (await api.get<IncidentDetail>(path(id))).data,
  create: async (body: CreateIncident) =>
    (await api.post<IncidentDetail>("/api/v1/incidents", body)).data,
  update: async (id: string, body: UpdateIncident) =>
    (await api.patch<IncidentDetail>(path(id), body)).data,
  changeStatus: async (id: string, body: ChangeIncidentStatus) =>
    (await api.post<IncidentDetail>(`${path(id)}/status`, body)).data,
  remove: async (id: string) => {
    await api.delete(path(id));
  },
  addNote: async (
    id: string,
    body: { readonly body: string; readonly occurredAt?: string },
  ) => (await api.post<TimelineEntry>(`${path(id)}/timeline`, body)).data,
  removeNote: async (id: string, entryId: string) => {
    await api.delete(`${path(id)}/timeline/${encodeURIComponent(entryId)}`);
  },
  openThread: async (id: string) =>
    (await api.post<Discussion>(`${path(id)}/discord-thread`)).data,
  recoverThread: async (id: string, threadId: string | null) => {
    await api.post(`${path(id)}/discord-thread/recovery`, { threadId });
  },
  postmortem: async (id: string) =>
    (await api.get<Postmortem>(`${path(id)}/postmortem`)).data,
  draft: async (id: string) =>
    (await api.get<PostmortemSections>(`${path(id)}/postmortem/draft`)).data,
  createPostmortem: async (id: string) =>
    (await api.post<Postmortem>(`${path(id)}/postmortem`)).data,
  updatePostmortem: async (id: string, body: UpdatePostmortem) =>
    (await api.patch<Postmortem>(`${path(id)}/postmortem`, body)).data,
  addActionItem: async (id: string, title: string) =>
    (
      await api.post<ActionItem>(`${path(id)}/postmortem/action-items`, {
        title,
      })
    ).data,
  removeActionItem: async (id: string, itemId: string) => {
    await api.delete(
      `${path(id)}/postmortem/action-items/${encodeURIComponent(itemId)}`,
    );
  },
  createActionItemTask: async (
    id: string,
    itemId: string,
    body: CreateActionItemTask,
  ) =>
    (
      await api.post<ActionItem>(
        `${path(id)}/postmortem/action-items/${encodeURIComponent(itemId)}/task`,
        body,
      )
    ).data,
};

// 사고 목록·상세는 10초 폴링(계약 6절). 재조회 중에는 이전 데이터를 그대로 둔다(깜빡임 없음).
const polled = {
  refetchInterval: BOARD_POLL_INTERVAL,
  placeholderData: keepPreviousData,
} as const;

export const incidentQueries = {
  list: (filter: IncidentFilter) =>
    queryOptions({
      queryKey: incidentKeys.list(filter),
      queryFn: () => incidentApi.list(filter),
      ...polled,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: incidentKeys.detail(id),
      queryFn: () => incidentApi.detail(id),
      ...polled,
    }),
  /** 편집 중인 글이 폴링으로 덮이지 않게 사후 검토는 열 때와 저장 뒤에만 받는다. */
  postmortem: (id: string) =>
    queryOptions({
      queryKey: incidentKeys.postmortem(id),
      queryFn: () => incidentApi.postmortem(id),
      retry: false,
    }),
};
