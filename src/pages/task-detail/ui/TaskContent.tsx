import {
  priorityLabels,
  statusLabels,
  taskStatuses,
  type TaskDetail,
  type TaskStatus,
} from "@/entities/task";
import { formatDate } from "@/shared/lib";
import { Markdown, Select } from "@/shared/ui";

export function TaskProperties({
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
    <aside className="task-props" aria-label="업무 속성">
      <dl>
        <div>
          <dt>상태</dt>
          <dd>
            {editable ? (
              <Select
                aria-label="상태 변경"
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
            ) : (
              <>
                <span
                  className="status-icon"
                  data-status={task.status}
                  aria-hidden="true"
                />
                {statusLabels[task.status]}
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>우선순위</dt>
          <dd>
            <span className="priority-label" data-priority={task.priority}>
              {priorityLabels[task.priority]}
            </span>
          </dd>
        </div>
        <div>
          <dt>타입</dt>
          <dd>{task.type === "DEV" ? "개발 업무" : "일반 업무"}</dd>
        </div>
        <div>
          <dt>담당자</dt>
          <dd>
            {task.assignees.map((person) => person.name).join(", ") || (
              <span className="text-muted">미지정</span>
            )}
          </dd>
        </div>
        <div>
          <dt>파트</dt>
          <dd>
            {task.part?.name ?? <span className="text-muted">미지정</span>}
          </dd>
        </div>
        <div>
          <dt>마감일</dt>
          <dd>
            {task.deadline ? (
              formatDate(task.deadline)
            ) : (
              <span className="text-muted">없음</span>
            )}
          </dd>
        </div>
        {task.completedAt && (
          <div>
            <dt>완료</dt>
            <dd>{formatDate(task.completedAt)}</dd>
          </div>
        )}
      </dl>
    </aside>
  );
}

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
