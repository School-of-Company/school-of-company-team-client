import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api";

// 서버 계약: 팀 문화(feat/experiments-team-guide). 조직에 하나뿐인 마크다운 문서.
export type GuideAuthor = {
  readonly id: string;
  readonly username: string;
  readonly name: string;
};

export type TeamGuide = {
  readonly content: string;
  readonly version: number;
  readonly updatedAt: string;
  readonly updatedBy: GuideAuthor | null;
  readonly canEdit: boolean;
};

export type GuideRevision = {
  readonly version: number;
  readonly updatedAt: string;
  readonly updatedBy: GuideAuthor | null;
};

export const teamGuideKeys = {
  all: ["team-guide"] as const,
  current: ["team-guide", "current"] as const,
  revisions: ["team-guide", "revisions"] as const,
  revision: (version: number) => ["team-guide", "revision", version] as const,
};

export const teamGuideApi = {
  get: async () => (await api.get<TeamGuide>("/api/v1/team-guide")).data,
  save: async (body: { content: string; baseVersion: number }) =>
    (await api.put<TeamGuide>("/api/v1/team-guide", body)).data,
  revisions: async () =>
    (await api.get<readonly GuideRevision[]>("/api/v1/team-guide/revisions"))
      .data,
  revision: async (version: number) =>
    (
      await api.get<GuideRevision & { readonly content: string }>(
        `/api/v1/team-guide/revisions/${version}`,
      )
    ).data,
};

export const teamGuideQueries = {
  current: () =>
    queryOptions({
      queryKey: teamGuideKeys.current,
      queryFn: teamGuideApi.get,
    }),
  revisions: () =>
    queryOptions({
      queryKey: teamGuideKeys.revisions,
      queryFn: teamGuideApi.revisions,
    }),
  revision: (version: number) =>
    queryOptions({
      queryKey: teamGuideKeys.revision(version),
      queryFn: () => teamGuideApi.revision(version),
    }),
};
