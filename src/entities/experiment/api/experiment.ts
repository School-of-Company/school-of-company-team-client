import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api";
import type {
  CreateExperiment,
  Experiment,
  ExperimentLinkKind,
  ExperimentOutcome,
  ExperimentStatus,
  ExperimentView,
  UpdateExperiment,
} from "../model/types";

const path = (id: string) => `/api/v1/experiments/${encodeURIComponent(id)}`;

export const experimentKeys = {
  all: ["experiments"] as const,
  list: (view: ExperimentView) => ["experiments", "list", view] as const,
  detail: (id: string) => ["experiments", "detail", id] as const,
};

export const experimentApi = {
  list: async (view: ExperimentView) =>
    (
      await api.get<readonly Experiment[]>("/api/v1/experiments", {
        params: { status: view },
      })
    ).data,
  detail: async (id: string) => (await api.get<Experiment>(path(id))).data,
  create: async (body: CreateExperiment) =>
    (await api.post<Experiment>("/api/v1/experiments", body)).data,
  update: async (id: string, body: UpdateExperiment) =>
    (await api.patch<Experiment>(path(id), body)).data,
  changeStatus: async (
    id: string,
    body: { status: ExperimentStatus; outcome?: ExperimentOutcome },
  ) => (await api.post<Experiment>(`${path(id)}/status`, body)).data,
  remove: async (id: string) => {
    await api.delete(path(id));
  },
  addLink: async (
    id: string,
    body: { kind: ExperimentLinkKind; targetId: string },
  ) => (await api.post<Experiment>(`${path(id)}/links`, body)).data,
  removeLink: async (id: string, kind: ExperimentLinkKind, targetId: string) =>
    (
      await api.delete<Experiment>(
        `${path(id)}/links/${kind}/${encodeURIComponent(targetId)}`,
      )
    ).data,
};

export const experimentQueries = {
  list: (view: ExperimentView) =>
    queryOptions({
      queryKey: experimentKeys.list(view),
      queryFn: () => experimentApi.list(view),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: experimentKeys.detail(id),
      queryFn: () => experimentApi.detail(id),
    }),
};
