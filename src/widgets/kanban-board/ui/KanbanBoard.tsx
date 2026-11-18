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
  type TaskStatus,
} from "@/entities/task";
import { Button, EmptyState, Select, Icon, IconButton } from "@/shared/ui";
import { BoardCard } from "./BoardCard";

export function KanbanBoard({
  board,
  sort,
  editable,
  pending,
  onMove,
  onMore,
  onCreate,
  onSelect,
  visibleStatus,
  onVisibleStatus,
}: {
  readonly board: Board;
  readonly sort: BoardSort;
  readonly editable: (task: TaskCard) => boolean;
  readonly pending: boolean;
  readonly onMove: (id: string, move: MoveTask) => void;
  readonly onMore: () => void;
  readonly onCreate?: (status: TaskStatus) => void;
  readonly onSelect?: (id: string) => void;
  readonly visibleStatus: TaskStatus;
  readonly onVisibleStatus: (status: TaskStatus) => void;
}) {
  const [dragged, setDragged] = useState<TaskCard | null>(null);
  if (board.groups.length === 0)
    return (
      <EmptyState
        title="업무가 없습니다"
        description="필터를 조정하거나 새 업무를 추가해 주세요."
        action={
          onCreate && (
            <Button onClick={() => onCreate("BACKLOG")}>업무 추가</Button>
          )
        }
      />
    );
  return (
    <div className="grid gap-6">
      <label className="grid gap-2 text-sm md:hidden">
        표시할 상태
        <Select
          value={visibleStatus}
          onChange={(event) => {
            const next = taskStatuses.find(
              (status) => status === event.target.value,
            );
            if (next) onVisibleStatus(next);
          }}
        >
          {taskStatuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </Select>
      </label>
      {board.groups.map((group, lane) => (
        <section key={`${group.key ?? "none"}-${lane}`} className="min-w-0">
          {group.label && board.groups.length > 1 && (
            <h2 className="mb-3 text-sm font-semibold text-muted">
              {group.label}
            </h2>
          )}
          <div className="board-columns grid min-w-0 gap-3 md:grid-cols-3 xl:grid-cols-5">
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
                  className={`board-column ${status === visibleStatus ? "block" : "hidden md:block"} min-w-0`}
                  onDragOver={(event) => {
                    if (dragged && sort === "manual") event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    drop(null);
                  }}
                >
                  <div className="board-column-header">
                    <Heading className="flex min-w-0 items-center gap-2 text-sm font-medium">
                      <span>{statusLabels[status]}</span>
                      <span className="font-normal text-muted tabular-nums">
                        {cards.length}
                      </span>
                    </Heading>
                    {onCreate && (
                      <IconButton
                        variant="ghost"
                        aria-label={`${statusLabels[status]} 업무 추가`}
                        onClick={() => onCreate(status)}
                      >
                        <Icon name="plus" />
                      </IconButton>
                    )}
                  </div>
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
                          onSelect={onSelect}
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
                    <div className="board-empty">
                      <span className="sr-only">업무 없음</span>
                    </div>
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
