import type { WhiteboardCursor } from "@/entities/whiteboard";

/** 서버가 남기는 appState 는 이 넷뿐이다(D10-2). 확대·스크롤·선택은 보는 사람마다 다르다. */
const SHARED_APP_STATE = [
  "viewBackgroundColor",
  "gridSize",
  "gridStep",
  "gridModeEnabled",
] as const;

export function sharedAppState(
  appState: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const shared: Record<string, unknown> = {};
  for (const key of SHARED_APP_STATE)
    if (appState[key] !== undefined) shared[key] = appState[key];
  return shared;
}

type Versioned = {
  readonly id: string;
  readonly version: number;
  readonly versionNonce: number;
  readonly isDeleted: boolean;
};

/**
 * 이력 복원을 평범한 새 저장으로 만든다. 다른 화면은 요소 version 이 높은 쪽을 남기며 병합하므로(reconcileElements),
 * 옛 요소를 그대로 넣으면 지금 요소에 져서 복원이 되돌려진다. 그래서 복원본은 지금보다 version 을 올리고,
 * 복원본에 없는 지금 요소는 지움 표시(isDeleted)를 올려 둔다.
 */
export function restoreOnto<T extends Versioned>(
  current: readonly T[],
  revision: readonly T[],
  nonce: () => number = () => Math.floor(Math.random() * 2 ** 31),
): T[] {
  const currentById = new Map(current.map((element) => [element.id, element]));
  const revisionIds = new Set(revision.map((element) => element.id));
  const bump = (element: T, base: number, isDeleted: boolean): T => ({
    ...element,
    isDeleted,
    version: base + 1,
    versionNonce: nonce(),
  });
  const restored = revision.map((element) =>
    bump(
      element,
      Math.max(element.version, currentById.get(element.id)?.version ?? 0),
      element.isDeleted,
    ),
  );
  const removed = current
    .filter((element) => !revisionIds.has(element.id) && !element.isDeleted)
    .map((element) => bump(element, element.version, true));
  return [...restored, ...removed];
}

export type CollaboratorView = {
  readonly id: string;
  readonly username: string;
  readonly avatarUrl?: string;
  readonly pointer: { x: number; y: number; tool: "pointer" };
  readonly selectedElementIds: Record<string, true>;
};

/** 서버 커서 → Excalidraw collaborators. 키는 사용자 id(Excalidraw 가 이 값으로 색을 고른다). */
export function toCollaborators(
  cursors: readonly WhiteboardCursor[],
): Map<string, CollaboratorView> {
  return new Map(
    cursors.map((cursor) => [
      cursor.user.id,
      {
        id: cursor.user.id,
        username: cursor.user.name,
        avatarUrl: cursor.user.avatarUrl ?? undefined,
        pointer: { x: cursor.x, y: cursor.y, tool: "pointer" },
        selectedElementIds: Object.fromEntries(
          cursor.selectedElementIds.map((id) => [id, true] as const),
        ),
      },
    ]),
  );
}

/** 서버는 선택 요소를 200개까지 받는다. 그 이상은 커서에 굳이 다 보이지 않아도 된다. */
export function selectedIds(
  selected: Readonly<Record<string, boolean>>,
): string[] {
  return Object.keys(selected)
    .filter((id) => selected[id])
    .slice(0, 200);
}
