import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api";
import type {
  AddKnowledgeLink,
  CreateKnowledge,
  KnowledgeDetail,
  KnowledgeFilter,
  KnowledgeSummary,
  UpdateKnowledge,
} from "../model/types";

const path = (id: string) => `/api/v1/knowledge/${encodeURIComponent(id)}`;

export const knowledgeKeys = {
  all: ["knowledge"] as const,
  list: (filter: KnowledgeFilter) =>
    [
      "knowledge",
      "list",
      filter.kind ?? "",
      filter.status ?? "",
      filter.serviceId ?? "",
      filter.taskId ?? "",
      filter.incidentId ?? "",
    ] as const,
  detail: (id: string) => ["knowledge", "detail", id] as const,
};

export const knowledgeApi = {
  list: async (filter: KnowledgeFilter) =>
    (
      await api.get<readonly KnowledgeSummary[]>("/api/v1/knowledge", {
        params: { ...filter, limit: 200 },
      })
    ).data,
  detail: async (id: string) =>
    (await api.get<KnowledgeDetail>(path(id))).data,
  create: async (body: CreateKnowledge) =>
    (await api.post<KnowledgeDetail>("/api/v1/knowledge", body)).data,
  update: async (id: string, body: UpdateKnowledge) =>
    (await api.patch<KnowledgeDetail>(path(id), body)).data,
  remove: async (id: string) => {
    await api.delete(path(id));
  },
  addLink: async (id: string, body: AddKnowledgeLink) =>
    (await api.post<KnowledgeDetail>(`${path(id)}/links`, body)).data,
  removeLink: async (id: string, linkId: string) =>
    (
      await api.delete<KnowledgeDetail>(
        `${path(id)}/links/${encodeURIComponent(linkId)}`,
      )
    ).data,
};

// 문서는 열 때 한 번 받는다(계약 6절: 폴링은 사고 목록·상세만). 창으로 돌아오면 TanStack 기본 재조회.
export const knowledgeQueries = {
  list: (filter: KnowledgeFilter) =>
    queryOptions({
      queryKey: knowledgeKeys.list(filter),
      queryFn: () => knowledgeApi.list(filter),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: knowledgeKeys.detail(id),
      queryFn: () => knowledgeApi.detail(id),
    }),
};
