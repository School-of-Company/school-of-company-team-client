import Link from "next/link";
import type { DragEvent, ReactNode } from "react";
import { statusLabels, type TaskCard } from "@/entities/task";
import { routes } from "@/shared/config";

/** Sprint 화면의 한 줄 업무: 상태 · 키 · 제목, 아래 줄에 버킷·담당자. 끝에 동작 칸. */
export function TaskRow({
  task,
  leading,
  action,
  draggable,
  onDragStart,
}: {
  readonly task: TaskCard;
  readonly leading?: ReactNode;
  readonly action?: ReactNode;
  readonly draggable?: boolean;
  readonly onDragStart?: (event: DragEvent<HTMLLIElement>) => void;
}) {
  const people = task.assignees.map((person) => person.name).join(", ");
  return (
    <li
      className="plan-task"
      draggable={draggable}
      onDragStart={onDragStart}
      data-draggable={draggable || undefined}
    >
      {leading}
      <span
        className="status-icon"
        data-status={task.status}
        role="img"
        aria-label={statusLabels[task.status]}
      />
      <span className="plan-task-body">
        <span className="plan-task-title">
          <span className="font-mono text-xs text-muted">{task.key}</span>{" "}
          <Link href={routes.task(task.id)} className="hover:underline">
            {task.title}
          </Link>
          {task.blocked && <span className="plan-task-flag">막힘</span>}
        </span>
        {(task.planningBucket || people) && (
          <span className="plan-task-meta">
            {task.planningBucket && <span>{task.planningBucket.name}</span>}
            {people && <span>{people}</span>}
          </span>
        )}
      </span>
      {action && <span className="plan-task-action">{action}</span>}
    </li>
  );
}
