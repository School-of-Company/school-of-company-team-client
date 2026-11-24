import type { ReactNode } from "react";
import Link from "next/link";
import type { TaskDetail } from "@/entities/task";
import { Button, Icon } from "@/shared/ui";

export function TaskDetailHeader({
  task,
  headerAction,
  editable,
  canDelete,
  onEdit,
  onDelete,
}: {
  readonly task: TaskDetail;
  readonly headerAction?: ReactNode;
  readonly editable: boolean;
  readonly canDelete: boolean;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}) {
  const boardName =
    task.projectName ?? (task.scope === "TEAM" ? "팀 공용" : "내 업무");
  return (
    <div className="task-detail-heading">
      {!headerAction && (
        <Link
          href={
            task.projectId
              ? `/projects/${encodeURIComponent(task.projectId)}`
              : task.scope === "TEAM"
                ? "/team"
                : "/me"
          }
          className="task-detail-back ui-button ui-button-ghost ui-button-sm -ml-2 gap-1"
          aria-label={`${boardName} 보드로 돌아가기`}
        >
          <Icon name="chevronLeft" aria-hidden />
          {boardName}
        </Link>
      )}
      <header className="grid min-w-0 flex-1 gap-1">
        <p className="font-mono text-xs text-muted">
          {task.key ??
            (task.scope === "PERSONAL" ? "개인 업무" : "팀 공용 업무")}
        </p>
        <h1 className="task-title">{task.title}</h1>
      </header>
      <span className="flex flex-wrap items-center gap-2">
        {headerAction}
        {editable && (
          <Button variant="secondary" className="ui-button-sm" onClick={onEdit}>
            수정
          </Button>
        )}
        {canDelete && (
          <Button variant="ghost" className="ui-button-sm" onClick={onDelete}>
            삭제
          </Button>
        )}
      </span>
    </div>
  );
}
