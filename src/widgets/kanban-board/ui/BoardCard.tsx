"use client";

import Link from "next/link";
import {
  priorityLabels,
  type TaskCard,
  type TaskStatus,
} from "@/entities/task";
import { formatDate } from "@/shared/lib";
import { BoardCardMenu } from "./BoardCardMenu";

export function BoardCard({
  task,
  editable,
  manual,
  pending,
  onMove,
  onOrder,
  onSelect,
}: {
  readonly task: TaskCard;
  readonly editable: boolean;
  readonly manual: boolean;
  readonly pending: boolean;
  readonly onMove: (status: TaskStatus) => void;
  readonly onOrder: (direction: "up" | "down") => void;
  readonly onSelect?: (id: string) => void;
}) {
  const source =
    task.projectName ?? (task.scope === "PERSONAL" ? "개인 업무" : "팀 공용");
  return (
    <article className="board-card relative min-w-0 rounded-md border border-border bg-surface p-3">
      <div className="flex min-w-0 items-start justify-between gap-1">
        <div className="min-w-0 pt-2 text-xs text-muted">
          {task.key && <span className="font-mono">{task.key}</span>}
          <span className={task.key ? "sr-only" : ""}>{source}</span>
        </div>
        <BoardCardMenu
          task={task}
          editable={editable}
          manual={manual}
          pending={pending}
          onMove={onMove}
          onOrder={onOrder}
        />
      </div>
      <Link
        href={`/tasks/${encodeURIComponent(task.id)}`}
        className="block min-h-11 py-2 text-sm font-medium [overflow-wrap:anywhere] break-keep after:absolute after:inset-0"
        onClick={(event) => {
          if (
            onSelect &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey &&
            window.matchMedia("(min-width: 768px)").matches
          ) {
            event.preventDefault();
            event.currentTarget.focus();
            onSelect(task.id);
          }
        }}
      >
        {task.title}
      </Link>
      {task.issue && (
        <p
          className="board-card-issue"
          title={`${task.issue.repositoryFullName} #${task.issue.number}`}
        >
          <span className="truncate">
            {task.issue.repositoryFullName.split("/").pop()}
          </span>
          <span className="shrink-0">
            {task.issue.kind === "PR" ? "PR" : ""} #{task.issue.number}
          </span>
        </p>
      )}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-x-2" aria-label="담당자">
          {task.assignees.length ? (
            task.assignees.map((person) => (
              <span key={person.id} className="text-xs">
                {person.name}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted">미지정</span>
          )}
        </div>
        <span
          className="board-priority"
          data-priority={task.priority}
          title={`우선순위 ${task.priority}`}
        >
          {priorityLabels[task.priority]}
        </span>
      </div>
      {task.deadline && (
        <p className="mt-2 text-sm text-muted">
          마감 {formatDate(task.deadline)}
        </p>
      )}
      {task.blocked && (
        <p className="mt-2 text-sm break-words text-danger">
          막힘{task.blockedReason ? ": " + task.blockedReason : ""}
        </p>
      )}
    </article>
  );
}
