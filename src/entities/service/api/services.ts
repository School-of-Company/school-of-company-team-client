import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";
import type {
  CreateService,
  Deployment,
  DependencyGraph,
  DependencyKind,
  OwnerEntry,
  ReleaseDetail,
  ReleaseSummary,
  ServiceDetail,
  ServiceSummary,
  UpdateService,
} from "../model/types";

const path = (id: string) => `/api/v1/services/${encodeURIComponent(id)}`;

export const serviceKeys = {
  all: ["services"] as const,
  list: (archived: boolean) => ["services", "list", archived] as const,
  detail: (id: string) => ["services", "detail", id] as const,
  graph: ["services", "graph"] as const,
  releases: (id: string) => ["services", "releases", id] as const,
  release: (id: string) => ["services", "release", id] as const,
  deployments: (id: string) => ["services", "deployments", id] as const,
  installable: (id: string) => ["services", "installable", id] as const,
};

export const serviceApi = {
  list: async (archived: boolean) =>
    (
      await api.get<readonly ServiceSummary[]>("/api/v1/services", {
        params: { archived },
      })
    ).data,
  detail: async (id: string) => (await api.get<ServiceDetail>(path(id))).data,
  graph: async () =>
    (await api.get<DependencyGraph>("/api/v1/services/dependency-graph")).data,
  releases: async (id: string) =>
    (
      await api.get<readonly ReleaseSummary[]>(`${path(id)}/releases`, {
        params: { limit: 50 },
      })
    ).data,
  release: async (id: string) =>
    (await api.get<ReleaseDetail>(`/api/v1/releases/${encodeURIComponent(id)}`))
      .data,
  deployments: async (id: string) =>
    (
      await api.get<readonly Deployment[]>(`${path(id)}/deployments`, {
        params: { limit: 100 },
      })
    ).data,
  installable: async (id: string) =>
    (
      await api.get<
        readonly {
          readonly installationId: number;
          readonly repositoryId: number;
          readonly fullName: string;
          readonly private: boolean;
          readonly archived: boolean;
        }[]
      >(`${path(id)}/installable-repositories`)
    ).data,
  create: async (body: CreateService) =>
    (await api.post<ServiceDetail>("/api/v1/services", body)).data,
  update: async (id: string, body: UpdateService) =>
    (await api.patch<ServiceDetail>(path(id), body)).data,
  archive: async (id: string, archived: boolean) =>
    (
      await api.post<ServiceDetail>(
        `${path(id)}/${archived ? "archive" : "restore"}`,
      )
    ).data,
  replaceOwners: async (id: string, owners: readonly OwnerEntry[]) =>
    (await api.put<ServiceDetail>(`${path(id)}/owners`, { owners })).data,
  linkRepository: async (
    id: string,
    body: { readonly installationId: number; readonly repositoryId: number },
  ) => (await api.post<ServiceDetail>(`${path(id)}/repositories`, body)).data,
  updateRepository: async (
    id: string,
    repositoryId: number,
    body: {
      readonly deployWorkflowName: string;
      readonly deployEnvironment: string;
    },
  ) =>
    (
      await api.patch<ServiceDetail>(
        `${path(id)}/repositories/${repositoryId}`,
        body,
      )
    ).data,
  unlinkRepository: async (id: string, repositoryId: number) => {
    await api.delete(`${path(id)}/repositories/${repositoryId}`);
  },
  addDependency: async (
    id: string,
    body: {
      readonly targetServiceId: string;
      readonly kind: DependencyKind;
      readonly note?: string;
    },
  ) => (await api.post<ServiceDetail>(`${path(id)}/dependencies`, body)).data,
  removeDependency: async (id: string, targetServiceId: string) => {
    await api.delete(
      `${path(id)}/dependencies/${encodeURIComponent(targetServiceId)}`,
    );
  },
};

// 화면 조회는 10초 폴링, 재조회 중에는 이전 데이터를 그대로 둔다(깜빡임 없음).
const polled = {
  refetchInterval: BOARD_POLL_INTERVAL,
  placeholderData: keepPreviousData,
} as const;

export const serviceQueries = {
  list: (archived: boolean) =>
    queryOptions({
      queryKey: serviceKeys.list(archived),
      queryFn: () => serviceApi.list(archived),
      ...polled,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: serviceKeys.detail(id),
      queryFn: () => serviceApi.detail(id),
      ...polled,
    }),
  graph: () =>
    queryOptions({
      queryKey: serviceKeys.graph,
      queryFn: serviceApi.graph,
      ...polled,
    }),
  releases: (id: string) =>
    queryOptions({
      queryKey: serviceKeys.releases(id),
      queryFn: () => serviceApi.releases(id),
      ...polled,
    }),
  release: (id: string) =>
    queryOptions({
      queryKey: serviceKeys.release(id),
      queryFn: () => serviceApi.release(id),
      // 계산 대기 중인 릴리스만 다시 본다.
      refetchInterval: (query) =>
        query.state.data?.itemsStatus === "PENDING"
          ? BOARD_POLL_INTERVAL
          : false,
    }),
  deployments: (id: string) =>
    queryOptions({
      queryKey: serviceKeys.deployments(id),
      queryFn: () => serviceApi.deployments(id),
      ...polled,
    }),
  installable: (id: string) =>
    queryOptions({
      queryKey: serviceKeys.installable(id),
      queryFn: () => serviceApi.installable(id),
    }),
};
