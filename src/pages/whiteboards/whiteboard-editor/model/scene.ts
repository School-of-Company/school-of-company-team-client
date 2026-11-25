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

type Insertable = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly groupIds?: readonly string[];
  readonly frameId?: string | null;
  readonly containerId?: string | null;
  readonly boundElements?: readonly { readonly id: string }[] | null;
  readonly startBinding?: { readonly elementId: string } | null;
  readonly endBinding?: { readonly elementId: string } | null;
  readonly isDeleted?: boolean;
};

/**
 * 템플릿·Mermaid 요소를 지금 보드에 넣을 수 있게 만든다. 같은 템플릿을 두 번 넣어도 id 가 겹치지 않게
 * 요소·묶음 id 를 새로 짓고(서로 가리키는 id 도 함께 바꾼다), (dx, dy)만큼 옮긴다. 지운 요소는 뺀다.
 */
export function prepareInsert<T extends Insertable>(
  elements: readonly T[],
  dx: number,
  dy: number,
  newId: () => string = () => crypto.randomUUID(),
): T[] {
  const live = elements.filter((element) => !element.isDeleted);
  const ids = new Map(live.map((element) => [element.id, newId()]));
  const groups = new Map<string, string>();
  const group = (id: string) => {
    if (!groups.has(id)) groups.set(id, newId());
    return groups.get(id)!;
  };
  const mapId = (id: string | null | undefined) =>
    id == null ? id : (ids.get(id) ?? null);
  return live.map((element) => {
    const next: Record<string, unknown> = {
      ...element,
      id: ids.get(element.id),
      x: element.x + dx,
      y: element.y + dy,
      // 순서 색인은 Excalidraw 가 넣을 때 다시 매긴다.
      index: null,
    };
    if (element.groupIds) next.groupIds = element.groupIds.map(group);
    if ("frameId" in element) next.frameId = mapId(element.frameId);
    if ("containerId" in element) next.containerId = mapId(element.containerId);
    if (element.boundElements)
      next.boundElements = element.boundElements
        .filter((bound) => ids.has(bound.id))
        .map((bound) => ({ ...bound, id: ids.get(bound.id) }));
    for (const key of ["startBinding", "endBinding"] as const) {
      const binding = element[key];
      if (binding)
        next[key] = ids.has(binding.elementId)
          ? { ...binding, elementId: ids.get(binding.elementId) }
          : null;
    }
    return next as T;
  });
}
