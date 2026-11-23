import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api";
import type {
  WhiteboardComment,
  WhiteboardDetail,
  WhiteboardPresence,
  WhiteboardRevision,
  WhiteboardRevisionDetail,
  WhiteboardScene,
  WhiteboardSummary,
  WhiteboardTemplate,
} from "../model/types";

const base = "/api/v1/whiteboards";
const path = (id: string) => `${base}/${encodeURIComponent(id)}`;

export const whiteboardKeys = {
  all: ["whiteboards"] as const,
  /** projectId 가 없으면 팀 공용 목록. */
  list: (projectId: string | null) =>
    ["whiteboards", "list", projectId ?? "TEAM"] as const,
  detail: (id: string) => ["whiteboards", "detail", id] as const,
  templates: ["whiteboards", "templates"] as const,
  revisions: (id: string) => ["whiteboards", "revisions", id] as const,
  comments: (id: string) => ["whiteboards", "comments", id] as const,
};

export const whiteboardApi = {
  list: async (projectId: string | null) =>
    (
      await api.get<readonly WhiteboardSummary[]>(base, {
        params: projectId ? { projectId } : undefined,
      })
    ).data,
  detail: async (id: string) =>
    (await api.get<WhiteboardDetail>(path(id))).data,
  templates: async () =>
    (await api.get<readonly WhiteboardTemplate[]>(`${base}/templates`)).data,
  create: async (body: {
    projectId: string | null;
    title: string;
    templateId: string;
  }) => (await api.post<WhiteboardDetail>(base, body)).data,
  rename: async (id: string, title: string) =>
    (await api.patch<WhiteboardSummary>(path(id), { title })).data,
  remove: async (id: string) => {
    await api.delete(path(id));
  },
  saveScene: async (id: string, baseVersion: number, scene: WhiteboardScene) =>
    (
      await api.put<{ version: number; updatedAt: string }>(
        `${path(id)}/scene`,
        { baseVersion, scene },
      )
    ).data,
  presence: async (
    id: string,
    body: { x: number; y: number; selectedElementIds: readonly string[] },
  ) => (await api.put<WhiteboardPresence>(`${path(id)}/presence`, body)).data,
  revisions: async (id: string) =>
    (await api.get<readonly WhiteboardRevision[]>(`${path(id)}/revisions`))
      .data,
  revision: async (id: string, revisionId: string) =>
    (
      await api.get<WhiteboardRevisionDetail>(
        `${path(id)}/revisions/${encodeURIComponent(revisionId)}`,
      )
    ).data,
  restore: async (id: string, revisionId: string, baseVersion: number) =>
    (
      await api.post<{ version: number; updatedAt: string }>(
        `${path(id)}/revisions/${encodeURIComponent(revisionId)}/restore`,
        { baseVersion },
      )
    ).data,
  comments: async (id: string) =>
    (await api.get<readonly WhiteboardComment[]>(`${path(id)}/comments`)).data,
  addComment: async (
    id: string,
    body: { body: string; elementId?: string; x?: number; y?: number },
  ) => (await api.post<WhiteboardComment>(`${path(id)}/comments`, body)).data,
  resolveComment: async (id: string, commentId: string, resolved: boolean) =>
    (
      await api.patch<WhiteboardComment>(
        `${path(id)}/comments/${encodeURIComponent(commentId)}`,
        { resolved },
      )
    ).data,
  removeComment: async (id: string, commentId: string) => {
    await api.delete(`${path(id)}/comments/${encodeURIComponent(commentId)}`);
  },
};

export const whiteboardQueries = {
  list: (projectId: string | null) =>
    queryOptions({
      queryKey: whiteboardKeys.list(projectId),
      queryFn: () => whiteboardApi.list(projectId),
    }),
  // 상세는 편집 화면이 처음 한 번 받고, 이후 변경은 presence 의 version 으로 알아서 다시 받는다.
  detail: (id: string) =>
    queryOptions({
      queryKey: whiteboardKeys.detail(id),
      queryFn: () => whiteboardApi.detail(id),
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    }),
  templates: () =>
    queryOptions({
      queryKey: whiteboardKeys.templates,
      queryFn: whiteboardApi.templates,
      staleTime: Infinity,
    }),
  revisions: (id: string) =>
    queryOptions({
      queryKey: whiteboardKeys.revisions(id),
      queryFn: () => whiteboardApi.revisions(id),
    }),
  comments: (id: string) =>
    queryOptions({
      queryKey: whiteboardKeys.comments(id),
      queryFn: () => whiteboardApi.comments(id),
      refetchInterval: 10_000,
    }),
};
