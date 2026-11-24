import type { TaskDetail } from "@/entities/task";
import { Markdown } from "@/shared/ui";

export function TaskDescription({ task }: { readonly task: TaskDetail }) {
  return (
    <>
      {task.blocked && (
        <section>
          <h2 className="task-section-title">막힌 사유</h2>
          <p className="text-sm break-words whitespace-pre-wrap text-danger">
            {task.blockedReason || "사유가 적혀 있지 않습니다."}
          </p>
        </section>
      )}
      <section>
        <h2 className="task-section-title">설명</h2>
        {task.description ? (
          <Markdown>{task.description}</Markdown>
        ) : (
          <p className="text-sm text-muted">설명이 없습니다.</p>
        )}
      </section>
    </>
  );
}
