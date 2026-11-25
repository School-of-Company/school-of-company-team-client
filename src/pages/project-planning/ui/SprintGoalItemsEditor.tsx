import { Button, IconButton, Icon, Input } from "@/shared/ui";
import { GOAL_ITEM_LIMIT, type GoalItemDraft } from "../model/goal-items";

/** 목표 체크리스트 편집(최대 10개, 항목 200자). 빈 줄은 저장할 때 뺀다. */
export function SprintGoalItemsEditor({
  id,
  items,
  onChange,
  error,
}: {
  readonly id: string;
  readonly items: readonly GoalItemDraft[];
  readonly onChange: (items: readonly GoalItemDraft[]) => void;
  readonly error?: string;
}) {
  const full = items.length >= GOAL_ITEM_LIMIT;
  return (
    <fieldset
      className="grid min-w-0 gap-2"
      aria-describedby={error ? `${id}-error ${id}-hint` : `${id}-hint`}
    >
      <legend className="mb-2 text-sm font-medium">목표 체크리스트</legend>
      {items.length > 0 && (
        <ol className="goal-item-inputs">
          {items.map((item, index) => (
            <li key={item.key} className="goal-item-input">
              <Input
                aria-label={`목표 항목 ${index + 1}`}
                value={item.text}
                maxLength={200}
                placeholder="예: 로그인 개편 배포"
                onChange={(event) =>
                  onChange(
                    items.map((current) =>
                      current.key === item.key
                        ? { ...current, text: event.target.value }
                        : current,
                    ),
                  )
                }
              />
              <IconButton
                variant="ghost"
                aria-label={`목표 항목 ${index + 1} 빼기`}
                onClick={() =>
                  onChange(items.filter((current) => current.key !== item.key))
                }
              >
                <Icon name="close" />
              </IconButton>
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span id={`${id}-hint`} className="text-xs text-muted">
          종료할 때 항목마다 달성, 미달성을 적어요.{" "}
          <span className="tabular-nums">
            {items.length}/{GOAL_ITEM_LIMIT}
          </span>
        </span>
        <Button
          variant="secondary"
          className="ui-button-sm"
          disabled={full}
          onClick={() =>
            onChange([
              ...items,
              { key: `new-${Date.now()}-${items.length}`, text: "" },
            ])
          }
        >
          항목 추가
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
