import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api";

// 서버 계약: 팀 문화(feat/ops-v3). 섹션마다 마크다운 문서 하나, 버전은 섹션별로 쌓인다.
export type GuideSection =
  "CULTURE" | "COLLABORATION" | "PROJECT" | "DEVELOPMENT" | "OPERATIONS";

export type GuideAuthor = {
  readonly id: string;
  readonly username: string;
  readonly name: string;
};

export type TeamGuide = {
  readonly section: GuideSection;
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
  section: (section: GuideSection) => ["team-guide", section] as const,
  current: (section: GuideSection) =>
    ["team-guide", section, "current"] as const,
  revisions: (section: GuideSection) =>
    ["team-guide", section, "revisions"] as const,
  revision: (section: GuideSection, version: number) =>
    ["team-guide", section, "revision", version] as const,
};

const base = (section: GuideSection) => `/api/v1/team-guide/${section}`;

export const teamGuideApi = {
  get: async (section: GuideSection) =>
    (await api.get<TeamGuide>(base(section))).data,
  save: async (
    section: GuideSection,
    body: { content: string; baseVersion: number },
  ) => (await api.put<TeamGuide>(base(section), body)).data,
  revisions: async (section: GuideSection) =>
    (await api.get<readonly GuideRevision[]>(`${base(section)}/revisions`))
      .data,
  revision: async (section: GuideSection, version: number) =>
    (
      await api.get<GuideRevision & { readonly content: string }>(
        `${base(section)}/revisions/${version}`,
      )
    ).data,
};

export const teamGuideQueries = {
  current: (section: GuideSection) =>
    queryOptions({
      queryKey: teamGuideKeys.current(section),
      queryFn: () => teamGuideApi.get(section),
    }),
  revisions: (section: GuideSection) =>
    queryOptions({
      queryKey: teamGuideKeys.revisions(section),
      queryFn: () => teamGuideApi.revisions(section),
    }),
  revision: (section: GuideSection, version: number) =>
    queryOptions({
      queryKey: teamGuideKeys.revision(section, version),
      queryFn: () => teamGuideApi.revision(section, version),
    }),
};
