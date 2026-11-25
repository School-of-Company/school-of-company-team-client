// 서버 계약: docs/spec/s10-whiteboard.md, s16-whiteboard-v2.md(서버 저장소). 권한 판정은 서버가 하고 canEdit·canDelete 로 알려 준다.
import type { KnowledgeSummary } from "@/entities/knowledge/@x/whiteboard";
import type { TaskScope, TaskStatus } from "@/entities/task/@x/whiteboard";

export type WhiteboardScope = "PROJECT" | "TEAM";

export type WhiteboardPerson = {
  readonly id: string;
  readonly username: string;
  readonly name: string;
  readonly avatarUrl: string | null;
};

/** Excalidraw scene. 서버는 모양을 해석하지 않고 그대로 돌려준다. */
export type WhiteboardScene = {
  readonly elements: readonly unknown[];
  readonly appState?: Readonly<Record<string, unknown>>;
};

export type WhiteboardSummary = {
  readonly id: string;
  readonly scope: WhiteboardScope;
  readonly projectId: string | null;
  readonly title: string;
  readonly version: number;
  readonly createdBy: WhiteboardPerson | null;
  readonly updatedBy: WhiteboardPerson | null;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type WhiteboardDetail = WhiteboardSummary & {
  readonly format: string;
  readonly scene: WhiteboardScene;
};

// s16(화이트보드 v2): 내장 템플릿은 대문자 이름, 팀 템플릿(LEAD 관리)은 ULID 다.
export type WhiteboardTemplateCategory =
  "BASIC" | "MEETING" | "PLANNING" | "DIAGRAM";
export type WhiteboardTemplateSource = "BUILT_IN" | "TEAM";

export type WhiteboardTemplate = {
  readonly id: string;
  readonly source: WhiteboardTemplateSource;
  readonly name: string;
  /** 언제 쓰는지 한 줄. */
  readonly description: string;
  readonly category: WhiteboardTemplateCategory;
  /** 미리보기 scene. */
  readonly scene: WhiteboardScene;
};

export const whiteboardTemplateCategories = [
  "BASIC",
  "MEETING",
  "PLANNING",
  "DIAGRAM",
] as const satisfies readonly WhiteboardTemplateCategory[];

export const whiteboardTemplateCategoryLabels: Readonly<
  Record<WhiteboardTemplateCategory, string>
> = {
  BASIC: "기본",
  MEETING: "회의",
  PLANNING: "계획",
  DIAGRAM: "다이어그램",
};

export type CreateWhiteboardTemplate = {
  readonly name: string;
  readonly description: string;
  readonly category?: WhiteboardTemplateCategory;
  /** 이 화이트보드의 저장된 scene 을 복사한다. scene 과 둘 중 하나만. */
  readonly whiteboardId?: string;
  readonly scene?: WhiteboardScene;
};

export type UpdateWhiteboardTemplate = {
  readonly name?: string;
  readonly description?: string;
  readonly category?: WhiteboardTemplateCategory;
};

export const WHITEBOARD_TEMPLATE_NAME_MAX = 100;
export const WHITEBOARD_TEMPLATE_DESCRIPTION_MAX = 200;
export const WHITEBOARD_TEMPLATE_LIMIT = 50;

/** accessible=false 면 나머지가 null 이지만, 연결 목록은 못 읽는 대상을 아예 빼고 보낸다(D16-10). */
export type WhiteboardLinkedTask = {
  readonly id: string | null;
  readonly accessible: boolean;
  readonly key: string | null;
  readonly title: string | null;
  readonly status: TaskStatus | null;
  readonly scope: TaskScope | null;
};

export type WhiteboardTaskLink = {
  readonly linkId: string;
  readonly task: WhiteboardLinkedTask;
  readonly createdAt: string;
};

export type WhiteboardDocumentLink = {
  readonly linkId: string;
  readonly document: KnowledgeSummary;
  readonly createdAt: string;
};

export type WhiteboardLinks = {
  readonly tasks: readonly WhiteboardTaskLink[];
  readonly documents: readonly WhiteboardDocumentLink[];
};

/** 업무 합 문서. 서버가 화이트보드당 50개로 막는다(D16-8). */
export const WHITEBOARD_LINK_LIMIT = 50;

/** 업무·문서 상세에 실리는 연결된 화이트보드. */
export type WhiteboardRef = {
  readonly id: string;
  readonly title: string;
};

export type WhiteboardRevision = {
  readonly id: string;
  readonly version: number;
  readonly createdBy: WhiteboardPerson | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type WhiteboardComment = {
  readonly id: string;
  readonly elementId: string | null;
  readonly x: number | null;
  readonly y: number | null;
  readonly body: string;
  readonly author: WhiteboardPerson | null;
  readonly resolved: boolean;
  readonly resolvedBy: WhiteboardPerson | null;
  readonly resolvedAt: string | null;
  readonly canDelete: boolean;
  readonly createdAt: string;
};

export type WhiteboardCursor = {
  readonly user: WhiteboardPerson;
  readonly x: number;
  readonly y: number;
  readonly selectedElementIds: readonly string[];
  readonly updatedAt: string;
};

export type WhiteboardPresence = {
  readonly version: number;
  readonly cursors: readonly WhiteboardCursor[];
};

export const WHITEBOARD_TITLE_MAX = 100;
export const WHITEBOARD_COMMENT_MAX = 2000;

export type WhiteboardRevisionDetail = WhiteboardRevision & {
  readonly scene: WhiteboardScene;
};
