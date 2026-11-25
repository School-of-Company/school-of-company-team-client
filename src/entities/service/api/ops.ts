import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api";
import type {
  HealthCheckRun,
  HealthHistory,
  OpsOverview,
  ServiceOps,
  UpdateServiceOps,
  WebhookSecret,
} from "../model/ops";

/** 운영 화면은 30초마다 조용히 다시 받는다. 같은 키라 화면이 바뀌지 않는다. */
export const OPS_POLL_INTERVAL = 30_000;

const path = (id: string) => `/api/v1/services/${encodeURIComponent(id)}/ops`;

export const opsKeys = {
  all: ["ops"] as const,
  overview: ["ops", "overview"] as const,
  service: (id: string) => ["ops", "service", id] as const,
  history: (id: string) => ["ops", "history", id] as const,
};

export const opsApi = {
  overview: async () =>
    (await api.get<OpsOverview>("/api/v1/ops/overview")).data,
  service: async (id: string) => (await api.get<ServiceOps>(path(id))).data,
  update: async (id: string, body: UpdateServiceOps) =>
    (await api.put<ServiceOps>(path(id), body)).data,
  /** 지금 검사(소유자, LEAD). 같은 서비스에 10초 안에 다시 부르면 429(details.retryAfter 초). */
  runHealthCheck: async (id: string) =>
    (
      await api.post<HealthCheckRun>(
        `/api/v1/services/${encodeURIComponent(id)}/health-check/run`,
      )
    ).data,
  history: async (id: string) =>
    (
      await api.get<HealthHistory>(
        `/api/v1/services/${encodeURIComponent(id)}/health-checks`,
        { params: { range: "24h" } },
      )
    ).data,
  /** 비밀값은 이 응답에서 한 번만 온다. 캐시나 저장소에 넣지 않는다. */
  rotateWebhookSecret: async (id: string) =>
    (await api.post<WebhookSecret>(`${path(id)}/webhook-secret`)).data,
};

export const opsQueries = {
  overview: () =>
    queryOptions({
      queryKey: opsKeys.overview,
      queryFn: opsApi.overview,
      refetchInterval: OPS_POLL_INTERVAL,
    }),
  service: (id: string) =>
    queryOptions({
      queryKey: opsKeys.service(id),
      queryFn: () => opsApi.service(id),
      refetchInterval: OPS_POLL_INTERVAL,
    }),
  history: (id: string) =>
    queryOptions({
      queryKey: opsKeys.history(id),
      queryFn: () => opsApi.history(id),
      refetchInterval: OPS_POLL_INTERVAL,
    }),
};
