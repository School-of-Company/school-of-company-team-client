import {
  statusLabels,
  taskStatuses,
  type TaskDetail,
  type TaskStatus,
} from "@/entities/task";
import { formatDate } from "@/shared/lib";
import { Badge, Select } from "@/shared/ui";

export function TaskContent({
  task,
  editable,
  pending,
  onStatus,
}: {
  readonly task: TaskDetail;
  readonly editable: boolean;
  readonly pending: boolean;
  readonly onStatus: (status: TaskStatus) => void;
}) {
  return (
    <section className="grid gap-6 rounded-md border border-border bg-surface p-5">
      <div className="flex flex-wrap gap-2">
        <Badge>{task.type === "DEV" ? "개발 업무" : "일반 업무"}</Badge>
        <Badge>{task.priority}</Badge>
        <Badge>{statusLabels[task.status]}</Badge>
        {task.blocked && <Badge>막힘</Badge>}
      </div>
      {editable && (
        <label className="grid max-w-xs gap-2 text-sm font-semibold">
          상태 변경
          <Select
            value={task.status}
            disabled={pending}
            onChange={(event) => {
              const status = taskStatuses.find(
                (value) => value === event.target.value,
              );
              if (status) onStatus(status);
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
      )}
      <dl className="grid gap-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="mb-2 font-semibold">담당자</dt>
          <dd className="break-words text-muted">
            {task.assignees.map((person) => person.name).join(", ") || "미지정"}
          </dd>
        </div>
        <div>
          <dt className="mb-2 font-semibold">담당 파트</dt>
          <dd className="text-muted">{task.part?.name ?? "미지정"}</dd>
        </div>
        <div>
          <dt className="mb-2 font-semibold">마감일</dt>
          <dd className="text-muted">{formatDate(task.deadline)}</dd>
        </div>
        <div>
          <dt className="mb-2 font-semibold">완료 시각</dt>
          <dd className="text-muted">{formatDate(task.completedAt)}</dd>
        </div>
      </dl>
      {task.blocked && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">막힌 사유</h2>
          <p className="text-sm break-words whitespace-pre-wrap text-danger">
            {task.blockedReason}
          </p>
        </div>
      )}
      <div>
        <h2 className="mb-3 text-lg font-semibold">설명</h2>
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
          {task.description || "설명이 없습니다."}
        </p>
      </div>
    </section>
  );
}
