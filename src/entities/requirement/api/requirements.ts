import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";
import type {
  IntakeForm,
  MessageVisibility,
  RequirementDetail,
  RequirementMessage,
  RequirementStatus,
  RequirementSummary,
  RequirementTaskItem,
  SaveIntakeForm,
} from "../model/types";

const path = (id: string) => `/api/v1/requirements/${encodeURIComponent(id)}`;
const formPath = (id: string) =>
  `/api/v1/intake-forms/${encodeURIComponent(id)}`;
export const INBOX_PAGE = 50;

/** projectId 면 그 프로젝트, scope ORG 면 조직 단위(헤드 어드민), 둘 다 없으면 볼 수 있는 전부(12). */
export type InboxFilter = {
  readonly projectId?: string;
  readonly org?: boolean;
  readonly status?: RequirementStatus;
};

export const requirementKeys = {
  all: ["requirements"] as const,
  list: (filter: InboxFilter) =>
    [
      "requirements",
      "list",
      filter.projectId ?? "",
      filter.org ? "ORG" : "",
      filter.status ?? "",
    ] as const,
  detail: (id: string) => ["requirements", "detail", id] as const,
  forms: (projectId: string | null) =>
    ["intake-forms", projectId ?? "ORG"] as const,
};

export const requirementApi = {
  list: async (filter: InboxFilter, before?: string) =>
    (
      await api.get<readonly RequirementSummary[]>("/api/v1/requirements", {
        params: {
          projectId: filter.projectId || undefined,
          scope: filter.org ? "ORG" : undefined,
          status: filter.status || undefined,
          limit: INBOX_PAGE,
          before,
        },
      })
    ).data,
  detail: async (id: string) =>
    (await api.get<RequirementDetail>(path(id))).data,
  changeStatus: async (
    id: string,
    body: { readonly status: RequirementStatus; readonly reason?: string },
  ) => (await api.post<RequirementDetail>(`${path(id)}/status`, body)).data,
  addMessage: async (
    id: string,
    body: { readonly body: string; readonly visibility: MessageVisibility },
  ) => (await api.post<RequirementMessage>(`${path(id)}/messages`, body)).data,
  removeMessage: async (id: string, messageId: string) => {
    await api.delete(`${path(id)}/messages/${encodeURIComponent(messageId)}`);
  },
  move: async (id: string, projectId: string) =>
    (await api.post<RequirementDetail>(`${path(id)}/move`, { projectId })).data,
  createTasks: async (id: string, tasks: readonly RequirementTaskItem[]) =>
    (await api.post<RequirementDetail>(`${path(id)}/tasks`, { tasks })).data,
  linkTask: async (id: string, taskId: string) =>
    (await api.post<RequirementDetail>(`${path(id)}/tasks/link`, { taskId }))
      .data,
  unlinkTask: async (id: string, taskId: string) =>
    (
      await api.delete<RequirementDetail>(
        `${path(id)}/tasks/${encodeURIComponent(taskId)}`,
      )
    ).data,
  reissueStatusToken: async (id: string) =>
    (await api.post<{ statusToken: string }>(`${path(id)}/status-token`)).data,
  purgeRequester: async (id: string) => {
    await api.delete(`${path(id)}/requester`);
  },
  remove: async (id: string) => {
    await api.delete(path(id));
  },
};

export const intakeFormApi = {
  /** projectId 가 null 이면 조직 단위 양식(헤드 어드민). */
  list: async (projectId: string | null) =>
    (
      await api.get<readonly IntakeForm[]>(
        projectId
          ? `/api/v1/projects/${encodeURIComponent(projectId)}/intake-forms`
          : "/api/v1/intake-forms",
      )
    ).data,
  create: async (projectId: string | null, body: SaveIntakeForm) =>
    (
      await api.post<IntakeForm>(
        projectId
          ? `/api/v1/projects/${encodeURIComponent(projectId)}/intake-forms`
          : "/api/v1/intake-forms",
        body,
      )
    ).data,
  update: async (formId: string, body: SaveIntakeForm) =>
    (await api.patch<IntakeForm>(formPath(formId), body)).data,
  rotate: async (formId: string) =>
    (await api.post<IntakeForm>(`${formPath(formId)}/rotate`)).data,
  remove: async (formId: string) => {
    await api.delete(formPath(formId));
  },
};

// 접수함·상세는 다른 목록과 같이 10초 폴링. 접수함은 `before`(마지막 id)로 이어 받는다.
export const requirementQueries = {
  list: (filter: InboxFilter) =>
    infiniteQueryOptions({
      queryKey: requirementKeys.list(filter),
      queryFn: ({ pageParam }) => requirementApi.list(filter, pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) =>
        last.length === INBOX_PAGE ? last[last.length - 1]?.id : undefined,
      refetchInterval: BOARD_POLL_INTERVAL,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: requirementKeys.detail(id),
      queryFn: () => requirementApi.detail(id),
      refetchInterval: BOARD_POLL_INTERVAL,
    }),
  forms: (projectId: string | null) =>
    queryOptions({
      queryKey: requirementKeys.forms(projectId),
      queryFn: () => intakeFormApi.list(projectId),
    }),
};
