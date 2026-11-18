"use client";

import Link from "next/link";
import {
  statusLabels,
  taskStatuses,
  type TaskCard,
  type TaskStatus,
} from "@/entities/task";
import { formatDate } from "@/shared/lib";
import { Badge, Button, Select } from "@/shared/ui";

export function BoardCard({
  task,
  editable,
  manual,
  pending,
  onMove,
  onOrder,
}: {
  readonly task: TaskCard;
  readonly editable: boolean;
  readonly manual: boolean;
  readonly pending: boolean;
  readonly onMove: (status: TaskStatus) => void;
  readonly onOrder: (direction: "up" | "down") => void;
}) {
  return (
    <article className="min-w-0 rounded-md border border-border bg-surface p-3">
      <div className="mb-2 flex flex-wrap gap-2 text-xs text-muted">
        <span>
          {task.key ?? (task.scope === "PERSONAL" ? "개인" : "팀 공용")}
        </span>
        <Badge>{task.priority}</Badge>
        <Badge>{task.type === "DEV" ? "개발" : "일반"}</Badge>
      </div>
      <Link
        href={`/tasks/${encodeURIComponent(task.id)}`}
        className="block min-h-11 py-2 text-sm font-semibold break-words hover:text-brand"
      >
        {task.title}
      </Link>
      <p className="mt-2 text-xs break-words text-muted">
        {task.assignees.length
          ? task.assignees.map((user) => user.name).join(", ")
          : "담당자 미지정"}
        {task.part ? ` · ${task.part.name}` : ""}
      </p>
      {task.deadline && (
        <p className="mt-2 text-xs text-muted">
          마감 {formatDate(task.deadline)}
        </p>
      )}
      {task.blocked && (
        <p className="mt-2 text-sm break-words text-danger">
          막힘 · {task.blockedReason}
        </p>
      )}
      <Link
        href={
          task.projectId
            ? `/projects/${encodeURIComponent(task.projectId)}`
            : task.scope === "PERSONAL"
              ? "/me?source=PERSONAL"
              : "/team"
        }
        className="mt-2 inline-flex min-h-11 items-center text-xs break-words text-brand underline"
      >
        {task.projectName ??
          (task.scope === "PERSONAL" ? "개인 업무" : "팀 공용")}
        로 이동
      </Link>
      {editable && (
        <div className="mt-3 grid gap-2 border-t border-border pt-3">
          <label className="grid gap-1 text-xs">
            상태 변경
            <Select
              aria-label={`${task.title} 상태 변경`}
              value={task.status}
              disabled={pending}
              onChange={(event) => {
                const status = taskStatuses.find(
                  (value) => value === event.target.value,
                );
                if (status) onMove(status);
              }}
            >
              {taskStatuses.map((status) => (
                <option
                  key={status}
                  value={status}
                  disabled={task.type === "TASK" && status === "REVIEW"}
                >
                  {statusLabels[status]}
                </option>
              ))}
            </Select>
          </label>
          {manual && (
            <div className="flex flex-wrap gap-1">
              <Button
                variant="ghost"
                disabled={pending}
                aria-label={`${task.title} 위로 이동`}
                onClick={() => onOrder("up")}
              >
                위로
              </Button>
              <Button
                variant="ghost"
                disabled={pending}
                aria-label={`${task.title} 아래로 이동`}
                onClick={() => onOrder("down")}
              >
                아래로
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
