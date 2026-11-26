"use client";

import { useState } from "react";
import {
  boardTotal,
  laneDrop,
  laneTotal,
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

const laneStorage = "soc.board.collapsed-lanes";

function readCollapsed(scopeKey: string): readonly string[] {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(laneStorage) ?? "{}",
    );
    const value =
      saved && typeof saved === "object"
        ? (saved as Record<string, unknown>)[scopeKey]
        : undefined;
    return Array.isArray(value)
      ? value.filter((key): key is string => typeof key === "string")
      : [];
  } catch {
    return [];
  }
}

function writeCollapsed(scopeKey: string, keys: readonly string[]) {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(laneStorage) ?? "{}",
    );
    const next =
      saved && typeof saved === "object" ? { ...saved } : ({} as object);
    localStorage.setItem(
      laneStorage,
      JSON.stringify({ ...next, [scopeKey]: keys }),
    );
  } catch {
    // ponytail: 저장소를 못 쓰면 이번 화면에서만 접힘을 유지한다.
  }
}

export function KanbanBoard({
  board,
  sort,
  groupBy = null,
  laneScope = "",
  archivedBuckets = [],
  editable,
  pending,
  onMove,
  onMore,
  onCreate,
  onSelect,
  visibleStatus,
  onVisibleStatus,
  filtered,
  onClearFilters,
}: {
  readonly board: Board;
  readonly sort: BoardSort;
  /** 그룹 축. 있으면 레인 헤더(이름, 개수, 접기)를 그린다. */
  readonly groupBy?: string | null;
  /** 레인 접힘을 기억하는 범위(보드 경로 + 그룹 축). */
  readonly laneScope?: string;
  readonly archivedBuckets?: readonly string[];
  readonly editable: (task: TaskCard) => boolean;
  readonly pending: boolean;
  readonly onMove: (id: string, move: MoveTask) => void;
  readonly onMore: () => void;
  readonly onCreate?: (status: TaskStatus, laneKey?: string | null) => void;
  readonly onSelect?: (id: string) => void;
  readonly visibleStatus: TaskStatus;
  readonly onVisibleStatus: (status: TaskStatus) => void;
  /** URL 에 보드 필터가 하나라도 걸려 있는지. 빈 보드 안내의 문구와 행동이 갈린다. */
  readonly filtered: boolean;
  readonly onClearFilters: () => void;
}) {
  const [drag, setDrag] = useState<{
    readonly task: TaskCard;
    readonly lane: string | null;
  } | null>(null);
  const dragged = drag?.task ?? null;
  const collapseKey = `${laneScope}:${groupBy ?? ""}`;
  const [collapsed, setCollapsed] = useState(() => ({
    key: collapseKey,
    lanes: readCollapsed(collapseKey),
  }));
  // 그룹 축이 바뀌면 그 축의 접힘 기록을 다시 읽는다.
  const collapsedLanes =
    collapsed.key === collapseKey
      ? collapsed.lanes
      : readCollapsed(collapseKey);
  function toggleLane(lane: string) {
    const lanes = collapsedLanes.includes(lane)
      ? collapsedLanes.filter((key) => key !== lane)
      : [...collapsedLanes, lane];
    writeCollapsed(collapseKey, lanes);
    setCollapsed({ key: collapseKey, lanes });
  }
  // 레인이 하나뿐이면(예: 모두 "파트 없음") 머리글 없이 보드만 보인다. 그룹을 골라도 보드가 밀리지 않는다.
  const lanes = !!groupBy && board.groups.length > 1;
  // 업무가 하나도 없으면 빈 컬럼 다섯 개 대신 무엇을 할지 알려 준다.
  if (board.groups.length === 0 || boardTotal(board) === 0)
    return filtered ? (
      <EmptyState
        title="조건에 맞는 업무가 없어요"
        description="필터를 바꾸거나 초기화해 주세요."
        action={
          <Button variant="secondary" onClick={onClearFilters}>
            필터 초기화
          </Button>
        }
      />
    ) : (
      <EmptyState
        title="업무가 없어요"
        description={onCreate ? "첫 업무를 추가해 주세요." : undefined}
        action={
          onCreate && (
            <Button variant="secondary" onClick={() => onCreate("BACKLOG")}>
              업무 추가
            </Button>
          )
        }
      />
    );
  return (
    <div className={lanes ? "grid gap-5" : "grid"}>
      <label className="mb-3 grid gap-2 text-sm md:hidden">
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
      {board.groups.map((group, index) => {
        const laneId = group.key ?? "none";
        const folded = lanes && collapsedLanes.includes(laneId);
        const across = drag
          ? laneDrop({
              groupBy,
              fromKey: drag.lane,
              toKey: group.key,
              archivedBuckets,
            })
          : null;
        const total = laneTotal(group);
        // 보관 버킷 레인은 드롭처럼 생성도 받지 않는다(새로 넣을 수 없음).
        const archivedLane =
          groupBy === "bucket" &&
          group.key !== null &&
          archivedBuckets.includes(group.key);
        const bodyId = `board-lane-${index}`;
        return (
          <section
            key={`${laneId}-${index}`}
            className="board-lane min-w-0"
            data-lanes={lanes || undefined}
            data-locked={across && !across.allowed ? true : undefined}
          >
            {lanes && (
              <h2 className="board-lane-header">
                <button
                  type="button"
                  className="board-lane-toggle"
                  aria-expanded={!folded}
                  aria-controls={bodyId}
                  onClick={() => toggleLane(laneId)}
                >
                  <Icon name="chevronDown" className="board-lane-chevron" />
                  <span className="min-w-0 truncate">{group.label}</span>
                  <span className="board-lane-count tabular-nums">
                    {total}
                    <span className="sr-only">건</span>
                  </span>
                </button>
                {archivedLane && (
                  <span className="board-lane-note">
                    보관됨, 새로 넣을 수 없음
                  </span>
                )}
              </h2>
            )}
            <div id={bodyId} hidden={folded} className="board-columns">
              {taskStatuses.map((status) => {
                const cards = sortTaskCards(group.columns[status] ?? [], sort);
                const Heading = lanes ? "h3" : "h2";
                // 레인 counts가 없는 응답(단일 그룹)은 보드 전체 counts가 같은 값이다.
                const serverCount =
                  group.counts?.[status] ??
                  (board.groups.length === 1
                    ? board.counts[status]
                    : undefined);
                const count = serverCount ?? cards.length;
                const droppable =
                  !!dragged &&
                  sort === "manual" &&
                  !!across?.allowed &&
                  !(dragged.type === "TASK" && status === "REVIEW");
                function drop(beforeId: string | null) {
                  if (
                    dragged &&
                    across?.allowed &&
                    editable(dragged) &&
                    sort === "manual" &&
                    !pending &&
                    !(dragged.type === "TASK" && status === "REVIEW")
                  )
                    onMove(dragged.id, {
                      ...taskMoveAt({ cards, task: dragged, status, beforeId }),
                      ...(across.planningBucketId === undefined
                        ? {}
                        : { planningBucketId: across.planningBucketId }),
                    });
                  setDrag(null);
                }
                return (
                  <section
                    key={status}
                    aria-label={
                      lanes
                        ? `${group.label} ${statusLabels[status]}`
                        : statusLabels[status]
                    }
                    data-status={status}
                    className={`board-column ${status === visibleStatus ? "block" : "hidden md:block"} min-w-0`}
                    onDragOver={(event) => {
                      if (droppable) event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      drop(null);
                    }}
                  >
                    <div className="board-column-header">
                      <Heading className="flex min-w-0 items-center gap-2 text-sm font-medium">
                        <span
                          className="status-icon"
                          data-status={status}
                          aria-hidden="true"
                        />
                        <span>{statusLabels[status]}</span>
                        <span className="font-normal text-muted tabular-nums">
                          {count}
                        </span>
                      </Heading>
                      {onCreate && !archivedLane && (
                        <IconButton
                          variant="ghost"
                          aria-label={`${statusLabels[status]} 업무 추가`}
                          onClick={() =>
                            onCreate(status, lanes ? group.key : undefined)
                          }
                        >
                          <Icon name="plus" />
                        </IconButton>
                      )}
                    </div>
                    <div className="grid gap-2">
                      {cards.map((task) => (
                        <div
                          key={task.id}
                          draggable={
                            sort === "manual" && editable(task) && !pending
                          }
                          onDragStart={(event) => {
                            event.dataTransfer.setData("text/plain", task.id);
                            event.dataTransfer.effectAllowed = "move";
                            setDrag({ task, lane: group.key });
                          }}
                          onDragEnd={() => setDrag(null)}
                          onDragOver={(event) => {
                            if (droppable) event.preventDefault();
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
                                  ? (siblings[Math.max(0, index - 1)]?.id ??
                                    null)
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
                      <p className="board-empty">업무 없음</p>
                    )}
                    {status === "DONE" &&
                      (serverCount === undefined
                        ? cards.length > 0
                        : count > cards.length) && (
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
        );
      })}
    </div>
  );
}
