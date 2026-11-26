import { normalizeApiError } from "@/shared/api";
// 서버 계약: school-of-company-team-server docs/plan/intake-links-notion.md 2.4절(feat/project-links).
export const linkKinds = [
  "NOTION",
  "FIGMA",
  "GOOGLE_DOCS",
  "GOOGLE_SHEETS",
  "GOOGLE_SLIDES",
  "GOOGLE_DRIVE",
  "GITHUB",
  "YOUTUBE",
  "MIRO",
  "OTHER",
] as const;
export type LinkKind = (typeof linkKinds)[number];

export const linkKindLabels: Readonly<Record<LinkKind, string>> = {
  NOTION: "Notion",
  FIGMA: "Figma",
  GOOGLE_DOCS: "Google 문서",
  GOOGLE_SHEETS: "Google 스프레드시트",
  GOOGLE_SLIDES: "Google 프레젠테이션",
  GOOGLE_DRIVE: "Google 드라이브",
  GITHUB: "GitHub",
  YOUTUBE: "YouTube",
  MIRO: "Miro",
  OTHER: "링크",
};

export type LinkMetaStatus = "PENDING" | "OK" | "FAILED" | "SKIPPED";

export type ProjectLink = {
  readonly id: string;
  readonly url: string;
  readonly kind: LinkKind;
  /** 표시용. customTitle → meta.title → host 순으로 서버가 고른다. 항상 있다. */
  readonly title: string;
  /** 사용자가 적은 제목. 수정 화면 초기값. */
  readonly customTitle: string | null;
  readonly label: string | null;
  readonly host: string;
  readonly position: number;
  /** 알려진 서비스만. aspect는 "16:9"·"4:3"·"3:4". */
  readonly embed: { readonly url: string; readonly aspect: string } | null;
  readonly meta: {
    readonly status: LinkMetaStatus;
    readonly title: string | null;
    readonly description: string | null;
    readonly siteName: string | null;
    readonly fetchedAt: string | null;
  };
  readonly createdBy: {
    readonly id: string;
    readonly username: string;
    readonly name: string;
    readonly avatarUrl?: string | null;
  } | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
};

export type CreateProjectLink = {
  readonly url: string;
  readonly title?: string;
  readonly label?: string;
};

/** 보낸 필드만 바뀐다. title·label의 null은 비우기, url은 null 불가. */
export type UpdateProjectLink = {
  readonly url?: string;
  readonly title?: string | null;
  readonly label?: string | null;
};

/** 카드 둘째 줄: 수집 상태에 따라 설명 · 가져오는 중 · URL · 종류 이름. */
export function linkSummary(link: ProjectLink): string {
  switch (link.meta.status) {
    case "OK":
      return link.meta.description || link.meta.siteName || link.url;
    case "PENDING":
      return "페이지 정보를 가져오는 중이에요.";
    case "FAILED":
      return link.url;
    case "SKIPPED":
      return linkKindLabels[link.kind];
  }
}

/** "16:9" → "16 / 9"(CSS aspect-ratio). 읽을 수 없으면 16:9. */
export function aspectRatio(aspect: string): string {
  const match = /^(\d+):(\d+)$/.exec(aspect);
  return match ? `${match[1]} / ${match[2]}` : "16 / 9";
}

function detail(details: unknown, key: string): number | null {
  if (typeof details !== "object" || details === null || !(key in details))
    return null;
  const value = (details as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

function waitText(seconds: number): string {
  return seconds >= 60 ? `${Math.ceil(seconds / 60)}분` : `${seconds}초`;
}

/** 링크 API 오류 안내. 서버 code로 나누고 details(limit·retryAfterSeconds)를 문구에 넣는다. */
export function linkErrorMessage(error: unknown): string {
  const problem = normalizeApiError(error);
  switch (problem.code) {
    case "LINK_URL_INVALID":
      return "http 또는 https 주소만 넣을 수 있어요. 아이디, 비밀번호가 들어간 주소는 쓸 수 없어요.";
    case "VALIDATION_ERROR":
      return "입력값을 확인하세요. 주소는 2000자, 제목은 100자, 라벨은 30자까지예요.";
    case "PROJECT_FORBIDDEN":
      return "이 프로젝트의 링크를 바꿀 권한이 없어요. 삭제는 만든 사람과 PM, 헤드 어드민만 할 수 있어요.";
    case "PROJECT_NOT_FOUND":
      return "프로젝트를 찾을 수 없거나 접근할 수 없어요.";
    case "LINK_NOT_FOUND":
      return "링크가 없어요. 다른 사람이 삭제했을 수 있어 목록을 새로 불러와요.";
    case "PROJECT_ARCHIVED":
      return "아카이브된 프로젝트는 조회만 가능해요.";
    case "LINK_LIMIT_EXCEEDED":
      return `링크는 프로젝트당 ${detail(problem.details, "limit") ?? 50}개까지 둘 수 있어요. 안 쓰는 링크를 지운 뒤 추가하세요.`;
    case "STALE_LINK_ORDER":
      return "그사이 링크가 추가되거나 삭제됐어요. 목록을 새로 불러왔으니 다시 옮겨 주세요.";
    case "LINK_REFRESH_TOO_SOON": {
      const seconds = detail(problem.details, "retryAfterSeconds");
      return seconds
        ? `방금 가져왔어요. ${waitText(seconds)} 뒤에 다시 시도하세요.`
        : "방금 가져왔어요. 잠시 뒤에 다시 시도하세요.";
    }
    default:
      return problem.message;
  }
}
