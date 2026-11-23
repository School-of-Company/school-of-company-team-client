import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { projectKeys } from "@/entities/project";
import { api, normalizeApiError } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";
import type {
  CreateProjectLink,
  ProjectLink,
  UpdateProjectLink,
} from "../model/links";

const base = (projectId: string) =>
  `/api/v1/projects/${encodeURIComponent(projectId)}/links`;
const one = (projectId: string, linkId: string) =>
  `${base(projectId)}/${encodeURIComponent(linkId)}`;

export const projectLinkKeys = {
  list: (projectId: string) => ["projects", projectId, "links"] as const,
};

export const projectLinkApi = {
  list: async (projectId: string) =>
    (await api.get<readonly ProjectLink[]>(base(projectId))).data,
  create: async (projectId: string, body: CreateProjectLink) =>
    (await api.post<ProjectLink>(base(projectId), body)).data,
  update: async (projectId: string, linkId: string, body: UpdateProjectLink) =>
    (await api.patch<ProjectLink>(one(projectId, linkId), body)).data,
  remove: async (projectId: string, linkId: string) => {
    await api.delete(one(projectId, linkId));
  },
  reorder: async (projectId: string, linkIds: readonly string[]) =>
    (
      await api.put<readonly ProjectLink[]>(`${base(projectId)}/order`, {
        linkIds,
      })
    ).data,
  refresh: async (projectId: string, linkId: string) =>
    (await api.post<ProjectLink>(`${one(projectId, linkId)}/refresh`)).data,
};

export const projectLinkQueries = {
  /** 수집 대기(PENDING) 링크가 있을 때만 10초마다 다시 받는다. 보통 30초 안에 채워진다. */
  list: (projectId: string) =>
    queryOptions({
      queryKey: projectLinkKeys.list(projectId),
      queryFn: () => projectLinkApi.list(projectId),
      retry: false,
      refetchInterval: (query) =>
        query.state.data?.some((link) => link.meta.status === "PENDING")
          ? BOARD_POLL_INTERVAL
          : false,
    }),
};

export type LinkChange =
  | { readonly action: "create"; readonly body: CreateProjectLink }
  | {
      readonly action: "update";
      readonly linkId: string;
      readonly body: UpdateProjectLink;
    }
  | { readonly action: "delete"; readonly linkId: string }
  | { readonly action: "order"; readonly linkIds: readonly string[] }
  | { readonly action: "refresh"; readonly linkId: string };

/** 순서·삭제는 화면에 먼저 반영한다. 추가·수정·새로 고침은 서버 판별(종류·제목)을 기다린다. */
function optimistic(
  links: readonly ProjectLink[],
  change: LinkChange,
): readonly ProjectLink[] | null {
  if (change.action === "order")
    return change.linkIds.flatMap((id, position) => {
      const link = links.find((item) => item.id === id);
      return link ? [{ ...link, position }] : [];
    });
  if (change.action === "delete")
    return links.filter((link) => link.id !== change.linkId);
  return null;
}

export function useLinkChange(projectId: string) {
  const client = useQueryClient();
  const key = projectLinkKeys.list(projectId);
  return useMutation({
    mutationFn: async (change: LinkChange) => {
      switch (change.action) {
        case "create":
          return projectLinkApi.create(projectId, change.body);
        case "update":
          return projectLinkApi.update(projectId, change.linkId, change.body);
        case "delete":
          return projectLinkApi.remove(projectId, change.linkId);
        case "order":
          return projectLinkApi.reorder(projectId, change.linkIds);
        case "refresh":
          return projectLinkApi.refresh(projectId, change.linkId);
        default: {
          const unreachable: never = change;
          return unreachable;
        }
      }
    },
    onMutate: async (change) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<readonly ProjectLink[]>(key);
      const next = previous && optimistic(previous, change);
      if (next) client.setQueryData(key, next);
      return { previous };
    },
    onError: (error, _change, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
      // 아카이브·권한 변경은 프로젝트 머리(아카이브 안내·탭)와 쓰기 버튼에도 보인다.
      if (normalizeApiError(error).code.startsWith("PROJECT_"))
        void client.invalidateQueries({
          queryKey: projectKeys.detail(projectId),
        });
    },
    // STALE_LINK_ORDER·LINK_NOT_FOUND를 포함해 끝나면 항상 목록을 새로 받는다.
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
}
