import {
  incidentSeverities,
  incidentStatusLabels,
  severityLabels,
  type IncidentStatus,
} from "@/entities/incident";
import {
  kindLabels as documentKindLabels,
  knowledgeStatusLabels,
  type KnowledgeKind,
  type KnowledgeStatus,
} from "@/entities/knowledge";
import { statusLabels, type TaskStatus } from "@/entities/task";
import { tierLabels, type ServiceTier } from "@/entities/service";
import { routes } from "@/shared/config";

// 계약: 서버 docs/spec/s8-rules-search.md 5절. 읽기 정책(개인 업무 본인만, 비공개 원본은 현재 GitHub 권한까지)은 서버가 건다.
export type SearchType =
  "TASK" | "DOCUMENT" | "INCIDENT" | "SERVICE" | "SPRINT" | "WHITEBOARD";
export type SearchItem = {
  readonly type: SearchType;
  readonly id: string;
  readonly title: string;
  readonly key: string | null;
  readonly status: string | null;
  readonly context: string | null;
  readonly projectId: string | null;
  readonly updatedAt: string;
};
export type SearchGroup = {
  readonly type: SearchType;
  readonly items: readonly SearchItem[];
  readonly hasMore: boolean;
};
export type SearchResponse = {
  readonly query: string;
  readonly groups: readonly SearchGroup[];
  readonly unavailableTypes: readonly SearchType[];
};

/** 서버 SearchType 순서와 같다(묶음 순서). */
export const searchTypes = [
  "TASK",
  "DOCUMENT",
  "INCIDENT",
  "SERVICE",
  "SPRINT",
  "WHITEBOARD",
] as const satisfies readonly SearchType[];
export type SupportedSearchType = (typeof searchTypes)[number];
export const searchTypeLabels: Readonly<Record<SupportedSearchType, string>> = {
  TASK: "업무",
  DOCUMENT: "문서",
  INCIDENT: "장애",
  SERVICE: "서비스",
  SPRINT: "스프린트",
  WHITEBOARD: "화이트보드",
};
export const SEARCH_MAX_LENGTH = 100;

const sprintStatusLabels: Readonly<Record<string, string>> = {
  PLANNED: "예정",
  ACTIVE: "진행 중",
  CLOSED: "종료",
};

const supported = (type: SearchType): type is SupportedSearchType =>
  (searchTypes as readonly SearchType[]).includes(type);

/** 화면이 다룰 줄 아는 type 의 비지 않은 묶음만, 서버 순서대로. 서버가 아직 원천이 없는 type 은 응답에 묶음이 없다. */
export function visibleGroups(
  response: SearchResponse | undefined,
  only?: SupportedSearchType,
): readonly (SearchGroup & { readonly type: SupportedSearchType })[] {
  return (response?.groups ?? []).filter(
    (group): group is SearchGroup & { readonly type: SupportedSearchType } =>
      supported(group.type) &&
      group.items.length > 0 &&
      (only === undefined || group.type === only),
  );
}

/** 유형 필터에 보일 type. 서버가 원천이 없다고 알린 type 은 안내 없이 뺀다. */
export function availableTypes(
  response: SearchResponse | undefined,
): readonly SupportedSearchType[] {
  const missing = new Set(response?.unavailableTypes ?? []);
  return searchTypes.filter((type) => !missing.has(type));
}

export function itemHref(item: SearchItem): string | null {
  switch (item.type) {
    case "TASK":
      return routes.task(item.id);
    case "DOCUMENT":
      return routes.doc(item.id);
    case "INCIDENT":
      return routes.incident(item.id);
    case "SERVICE":
      return item.key ? routes.service(item.key) : null;
    case "SPRINT":
      return item.projectId
        ? routes.projectSprint(item.projectId, item.id)
        : null;
    case "WHITEBOARD":
      return routes.whiteboard(item.id);
    default:
      return null;
  }
}

/** 제목 옆 보조 표시(상태, 프로젝트·등급 등). 빈 값은 뺀다. */
export function itemMeta(item: SearchItem): readonly string[] {
  if (item.type === "TASK") {
    const context =
      item.context === "TEAM"
        ? "팀 공용"
        : item.context === "PERSONAL"
          ? "개인"
          : item.context;
    return [
      item.status
        ? (statusLabels[item.status as TaskStatus] ?? item.status)
        : null,
      context,
    ].filter((value): value is string => !!value);
  }
  // 문서·사고는 서버가 제목·상태·종류/심각도만 준다(연결 업무 정보는 응답에 없다).
  if (item.type === "DOCUMENT")
    return [
      item.status
        ? (knowledgeStatusLabels[item.status as KnowledgeStatus] ?? item.status)
        : null,
      item.context
        ? (documentKindLabels[item.context as KnowledgeKind] ?? item.context)
        : null,
    ].filter((value): value is string => !!value);
  if (item.type === "INCIDENT") {
    const severity = incidentSeverities.find((value) => value === item.context);
    return [
      severity ? severityLabels[severity] : item.context,
      item.status
        ? (incidentStatusLabels[item.status as IncidentStatus] ?? item.status)
        : null,
    ].filter((value): value is string => !!value);
  }
  if (item.type === "SERVICE")
    return item.context
      ? [tierLabels[item.context as ServiceTier] ?? item.context]
      : [];
  if (item.type === "SPRINT")
    return [
      item.status ? (sprintStatusLabels[item.status] ?? item.status) : null,
      item.context,
    ].filter((value): value is string => !!value);
  // 서버 context 는 프로젝트 key 또는 TEAM.
  if (item.type === "WHITEBOARD")
    return item.context
      ? [item.context === "TEAM" ? "팀 공용" : item.context]
      : [];
  return [];
}

const searchErrors: Readonly<Record<string, string>> = {
  ONBOARDING_REQUIRED: "가입 승인과 Discord 연결을 마친 뒤 검색할 수 있어요.",
  SUSPENDED: "이용이 중지된 계정은 검색할 수 없어요.",
  REJECTED: "가입이 거절된 계정은 검색할 수 없어요.",
  VALIDATION_ERROR: `검색어는 1~${SEARCH_MAX_LENGTH}자로 입력하세요.`,
};
export function searchErrorMessage(error: {
  readonly code: string;
  readonly message: string;
}) {
  return searchErrors[error.code] ?? error.message;
}

/** 위·아래 화살표 이동. 끝에서 반대쪽 끝으로 돈다. 결과가 없으면 -1. */
export function moveActive(
  active: number,
  delta: 1 | -1,
  count: number,
): number {
  if (count <= 0) return -1;
  if (active < 0) return delta > 0 ? 0 : count - 1;
  return (active + delta + count) % count;
}

/** ⌘K(맥)·Ctrl+K. 입력 중 조합(IME)일 때는 무시한다. */
export function isSearchShortcut(event: {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  readonly isComposing?: boolean;
}): boolean {
  return (
    !event.isComposing &&
    !event.altKey &&
    !event.shiftKey &&
    (event.metaKey || event.ctrlKey) &&
    event.key.toLowerCase() === "k"
  );
}
