import type { DragEvent } from "react";
import type { TaskCard } from "@/entities/task";
import { Button, Checkbox, EmptyState } from "@/shared/ui";
import { TaskRow } from "./TaskRow";

export function PlanTaskList({
  tasks,
  candidate = false,
  manages,
  busy,
  checked,
  onCheck,
  onAdd,
  onRemove,
  dragProps,
}: {
  readonly tasks: readonly TaskCard[];
  readonly candidate?: boolean;
  readonly manages: boolean;
  readonly busy: boolean;
  readonly checked: readonly string[];
  readonly onCheck: (id: string, checked: boolean) => void;
  readonly onAdd: (ids: readonly string[]) => void;
  readonly onRemove: (task: TaskCard) => void;
  readonly dragProps: (task: TaskCard) => {
    readonly draggable?: boolean;
    readonly onDragStart?: (event: DragEvent<HTMLLIElement>) => void;
  };
}) {
  return (
    <>
      <div className="plan-list-viewport">
        <ul
          className="plan-list"
          aria-label={candidate ? "후보 업무" : "스프린트 업무"}
        >
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              {...dragProps(task)}
              leading={
                candidate ? (
                  <Checkbox
                    aria-label={`${task.key} 선택`}
                    checked={checked.includes(task.id)}
                    disabled={busy}
                    onChange={(event) => onCheck(task.id, event.target.checked)}
                  />
                ) : undefined
              }
              action={
                manages && (
                  <Button
                    variant="ghost"
                    className="ui-button-sm"
                    aria-disabled={busy}
                    data-plan-task-action={task.id}
                    aria-label={`${task.key} 스프린트${candidate ? "에 넣기" : "에서 빼기"}`}
                    onClick={() =>
                      !busy && (candidate ? onAdd([task.id]) : onRemove(task))
                    }
                  >
                    {candidate ? "넣기" : "빼기"}
                  </Button>
                )
              }
            />
          ))}
        </ul>
        {tasks.length === 0 && (
          <EmptyState
            title={
              candidate ? "넣을 업무가 없습니다" : "아직 넣은 업무가 없습니다"
            }
            description={
              candidate
                ? "원천을 바꿔 다른 업무를 찾아보세요."
                : manages
                  ? "왼쪽 후보에서 넣기를 누르거나 여기로 끌어 오세요."
                  : undefined
            }
          />
        )}
      </div>
      {candidate && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            className="ui-button-sm"
            disabled={!checked.length || busy}
            onClick={() => onAdd(checked)}
          >
            {checked.length
              ? `선택한 ${checked.length}개 넣기`
              : "선택한 업무 넣기"}
          </Button>
        </div>
      )}
    </>
  );
}
