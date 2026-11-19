import {
  taskStatuses,
  type Board,
  type TaskCard,
  type TaskStatus,
} from "@/entities/task";

/** 보드 응답(그룹 없음)을 상태 순서 → 수동 순서로 편 목록. */
export function boardTasks(board: Board | undefined): readonly TaskCard[] {
  if (!board) return [];
  return board.groups.flatMap((group) =>
    taskStatuses.flatMap((status) =>
      [...group.columns[status]].sort(
        (left, right) =>
          left.position - right.position || left.id.localeCompare(right.id),
      ),
    ),
  );
}

export const openStatuses: readonly TaskStatus[] = taskStatuses.filter(
  (status) => status !== "DONE",
);

/** 계획 원천: 검토 필요, 버킷별(미완료), 버킷 없음(미완료), 미완료 전체. 값은 URL 에 그대로 둔다. */
export function sourceParams(projectKey: string, source: string) {
  const params = new URLSearchParams({ project: projectKey, sprint: "none" });
  if (source === "backlog") params.set("status", "BACKLOG");
  else {
    params.set("status", openStatuses.join(","));
    if (source.startsWith("bucket:")) params.set("bucket", source.slice(7));
    else if (source === "no-bucket") params.set("bucket", "none");
  }
  return params.toString();
}

export type ScopeOverlay = Readonly<Record<string, "add" | "remove">>;

/**
 * 넣기·빼기를 서버 응답 전에 먼저 보여 준다. 실패하면 overlay 를 지우는 것만으로 되돌아간다.
 * 후보에서 넣은 업무는 빠지고 Sprint 목록에 붙으며, 뺀 업무는 반대로 움직인다.
 */
export function applyScopeOverlay(
  candidates: readonly TaskCard[],
  scoped: readonly TaskCard[],
  overlay: ScopeOverlay,
) {
  const known = new Map(
    [...candidates, ...scoped].map((task) => [task.id, task]),
  );
  const added = Object.entries(overlay).flatMap(([id, action]) =>
    action === "add" && known.get(id) ? [known.get(id) as TaskCard] : [],
  );
  const removed = Object.entries(overlay).flatMap(([id, action]) =>
    action === "remove" && known.get(id) ? [known.get(id) as TaskCard] : [],
  );
  const scopedIds = new Set(scoped.map((task) => task.id));
  const candidateIds = new Set(candidates.map((task) => task.id));
  return {
    candidates: [
      ...candidates.filter((task) => overlay[task.id] !== "add"),
      ...removed.filter(
        (task) => !candidateIds.has(task.id) && task.status !== "DONE",
      ),
    ],
    scoped: [
      ...scoped.filter((task) => overlay[task.id] !== "remove"),
      ...added.filter((task) => !scopedIds.has(task.id)),
    ],
  };
}
