import type { Board, MoveTask, TaskCard, TaskStatus } from "./types";

export const boardFilterKeys = [
  "project",
  "owner",
  "part",
  "status",
  "priority",
  "type",
  "blocked",
  "dueWithin",
  "groupBy",
  "source",
  "repository",
] as const;
export type BoardFilterKey = (typeof boardFilterKeys)[number];
export type BoardSort = "manual" | "priority" | "deadline";

export function changeBoardFilter(
  search: string,
  key: BoardFilterKey,
  values: readonly string[],
) {
  const params = new URLSearchParams(search);
  const unique = [
    ...new Set(values.map((value) => value.trim()).filter(Boolean)),
  ];
  params.delete(key);
  if (unique.length) params.set(key, unique.join(","));
  params.delete("doneLimit");
  return params.toString();
}

export function boardRequestParams(search: string) {
  const input = new URLSearchParams(search);
  const params = new URLSearchParams();
  const scope = input.get("scope");
  if (scope === "TEAM" || scope === "PROJECT") params.set("scope", scope);
  for (const key of boardFilterKeys) {
    const values = input
      .getAll(key)
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter(Boolean);
    if (values.length) params.set(key, [...new Set(values)].join(","));
  }
  const limit = Number(input.get("doneLimit"));
  params.set(
    "doneLimit",
    Number.isSafeInteger(limit) && limit > 0 ? String(limit) : "50",
  );
  return params;
}

export function sortTaskCards(cards: readonly TaskCard[], sort: BoardSort) {
  return [...cards].sort((left, right) => {
    switch (sort) {
      case "manual":
        return (
          left.position - right.position || left.id.localeCompare(right.id)
        );
      case "priority":
        return (
          left.priority.localeCompare(right.priority) ||
          left.position - right.position ||
          left.id.localeCompare(right.id)
        );
      case "deadline":
        return (
          (left.deadline ?? "9999-12-31").localeCompare(
            right.deadline ?? "9999-12-31",
          ) ||
          left.position - right.position ||
          left.id.localeCompare(right.id)
        );
    }
  });
}

/** Counts come from the server because DONE columns may be truncated per lane. */
export function boardTotal(board: Board) {
  return Object.values(board.counts).reduce((total, count) => total + count, 0);
}

export function taskMoveAt(input: {
  readonly cards: readonly TaskCard[];
  readonly task: Pick<TaskCard, "id" | "scope" | "projectId">;
  readonly status: TaskStatus;
  readonly beforeId: string | null;
}): MoveTask {
  const cards = sortTaskCards(
    input.cards.filter(
      (card) =>
        card.id !== input.task.id &&
        card.scope === input.task.scope &&
        card.projectId === input.task.projectId,
    ),
    "manual",
  );
  const nextIndex =
    input.beforeId === null
      ? cards.length
      : cards.findIndex((card) => card.id === input.beforeId);
  const index = nextIndex < 0 ? cards.length : nextIndex;
  return {
    status: input.status,
    prevId: cards[index - 1]?.id ?? null,
    nextId: cards[index]?.id ?? null,
  };
}
