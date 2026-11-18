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
    <article className="board-card relative min-w-0 border">
      <div className="board-card-top">
        <span className="min-w-0 truncate">
          {task.key ? <span className="font-mono">{task.key}</span> : source}
          {task.key && <span className="sr-only">{source}</span>}
        </span>
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
        className="board-card-title"
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
            {task.issue.kind === "PR" ? "PR " : ""}#{task.issue.number}
          </span>
        </p>
      )}
      <div className="board-card-meta">
        <span className="min-w-0 truncate" aria-label="담당자">
          {task.assignees.map((person) => person.name).join(", ") || "미지정"}
        </span>
        <span
          className="priority-label"
          data-priority={task.priority}
          title={`우선순위 ${task.priority}`}
        >
          {priorityLabels[task.priority]}
        </span>
      </div>
      {task.status === "REVIEW" && !!task.reviewers?.length && (
        <p className="board-card-note board-card-reviewers">
          <span className="sr-only">리뷰어</span>
          <span aria-hidden="true">리뷰</span>{" "}
          {task.reviewers.map((person) => person.name).join(", ")}
        </p>
      )}
      {task.deadline && (
        <p className="board-card-note">마감 {formatDate(task.deadline)}</p>
      )}
      {task.blocked && (
        <p className="board-card-note break-words text-danger">
          막힘{task.blockedReason ? ": " + task.blockedReason : ""}
        </p>
      )}
    </article>
  );
}
