// 서버 계약: docs/spec/s10-whiteboard.md(서버 저장소). 권한 판정은 서버가 하고 canEdit·canDelete 로 알려 준다.
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

export type WhiteboardTemplate = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly scene: WhiteboardScene;
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
