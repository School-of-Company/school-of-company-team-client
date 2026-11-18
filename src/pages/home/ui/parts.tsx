import Link from "next/link";
import type { ReactNode } from "react";
import { statusLabels, type TaskCard } from "@/entities/task";
import { routes } from "@/shared/config";
import { Button } from "@/shared/ui";

export function Panel({
  id,
  title,
  meta,
  action,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly meta?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className="home-panel" aria-labelledby={`${id}-heading`}>
      <div className="home-panel-header">
        <h2 id={`${id}-heading`}>{title}</h2>
        {meta && (
          <span className="text-xs text-muted tabular-nums">{meta}</span>
        )}
        {action && <div className="ml-auto min-w-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/** 상태 · 키 · 제목 한 줄, 오른쪽(좁으면 아래)에 그 줄의 판단 근거. */
export function TaskRow({
  task,
  children,
}: {
  readonly task: TaskCard;
  readonly children?: ReactNode;
}) {
  const source =
    task.projectName ?? (task.scope === "PERSONAL" ? "개인 업무" : "팀 공용");
  return (
    <li className="home-row">
      <span
        className="status-icon"
        data-status={task.status}
        role="img"
        aria-label={statusLabels[task.status]}
      />
      <Link href={routes.task(task.id)} className="home-row-title">
        <span
          className={task.key ? "home-row-key" : "home-row-source"}
          title={source}
        >
          {task.key ?? source}
        </span>
        <span className="min-w-0 break-words">{task.title}</span>
      </Link>
      {children && <span className="home-row-meta">{children}</span>}
    </li>
  );
}

export function RetryNote({
  role,
  message,
  onRetry,
}: {
  readonly role: "alert" | "status";
  readonly message: string;
  readonly onRetry: () => void;
}) {
  return (
    <div role={role} className="home-note flex flex-wrap items-center gap-3">
      <span className="text-danger">{message}</span>
      <Button variant="secondary" className="ui-button-sm" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  );
}
