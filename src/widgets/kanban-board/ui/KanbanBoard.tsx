"use client";

import { useState } from "react";
import {
  sortTaskCards,
  statusLabels,
  taskMoveAt,
  taskStatuses,
  type Board,
  type BoardSort,
  type MoveTask,
  type TaskCard,
} from "@/entities/task";
import { Button } from "@/shared/ui";
import { BoardCard } from "./BoardCard";

export function KanbanBoard({
  board,
  sort,
  editable,
  pending,
  onMove,
  onMore,
  onCreate,
}: {
  readonly board: Board;
  readonly sort: BoardSort;
  readonly editable: (task: TaskCard) => boolean;
  readonly pending: boolean;
  readonly onMove: (id: string, move: MoveTask) => void;
  readonly onMore: () => void;
  readonly onCreate?: () => void;
}) {
  const [dragged, setDragged] = useState<TaskCard | null>(null);
  return (
    <div className="grid gap-8">
      {board.groups.map((group, lane) => (
        <section key={`${group.key ?? "none"}-${lane}`} className="min-w-0">
          {group.label && (
            <h2 className="mb-4 text-lg font-semibold">{group.label}</h2>
          )}
          <div className="grid min-w-0 gap-4 lg:grid-cols-3 xl:grid-cols-5">
            {taskStatuses.map((status) => {
              const cards = sortTaskCards(group.columns[status] ?? [], sort);
              const Heading = group.label ? "h3" : "h2";
              function drop(beforeId: string | null) {
                if (
                  dragged &&
                  editable(dragged) &&
                  sort === "manual" &&
                  !pending &&
                  !(dragged.type === "TASK" && status === "REVIEW")
                )
                  onMove(
                    dragged.id,
                    taskMoveAt({ cards, task: dragged, status, beforeId }),
                  );
                setDragged(null);
              }
              return (
                <section
                  key={status}
                  aria-label={`${group.label} ${statusLabels[status]}`}
                  className="min-w-0 rounded-md bg-surface-hover p-3"
                  onDragOver={(event) => {
                    if (dragged && sort === "manual") event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    drop(null);
                  }}
                >
                  <Heading className="mb-4 flex flex-wrap justify-between gap-2 text-sm font-semibold">
                    <span>{statusLabels[status]}</span>
                    <span>{cards.length}개 표시</span>
                  </Heading>
                  <div className="grid gap-3">
                    {cards.map((task) => (
                      <div
                        key={task.id}
                        draggable={
                          sort === "manual" && editable(task) && !pending
                        }
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", task.id);
                          event.dataTransfer.effectAllowed = "move";
                          setDragged(task);
                        }}
                        onDragEnd={() => setDragged(null)}
                        onDragOver={(event) => {
                          if (dragged && sort === "manual")
                            event.preventDefault();
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (task.id !== dragged?.id) drop(task.id);
                        }}
                      >
                        <BoardCard
                          task={task}
                          editable={editable(task)}
                          manual={sort === "manual"}
                          pending={pending}
                          onMove={(target) =>
                            onMove(task.id, {
                              status: target,
                              prevId: null,
                              nextId: null,
                            })
                          }
                          onOrder={(direction) => {
                            const siblings = cards.filter(
                              (card) =>
                                card.scope === task.scope &&
                                card.projectId === task.projectId,
                            );
                            const index = siblings.findIndex(
                              (card) => card.id === task.id,
                            );
                            const beforeId =
                              direction === "up"
                                ? (siblings[Math.max(0, index - 1)]?.id ?? null)
                                : (siblings[index + 2]?.id ?? null);
                            if (
                              (direction === "up" && index === 0) ||
                              (direction === "down" &&
                                index === siblings.length - 1)
                            )
                              return;
                            onMove(
                              task.id,
                              taskMoveAt({
                                cards,
                                task,
                                status,
                                beforeId,
                              }),
                            );
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {cards.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted">
                      업무가 없습니다
                    </p>
                  )}
                  {onCreate && (
                    <Button
                      variant="ghost"
                      className="mt-3 w-full"
                      onClick={onCreate}
                    >
                      업무 등록
                    </Button>
                  )}
                  {status === "DONE" && cards.length > 0 && (
                    <Button
                      variant="secondary"
                      className="mt-3 w-full"
                      onClick={onMore}
                    >
                      완료 더 보기
                    </Button>
                  )}
                </section>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
