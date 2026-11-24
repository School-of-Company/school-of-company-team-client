import { useId } from "react";
import { Checkbox } from "@/shared/ui";

export function TaskAssignees({
  people,
  selected,
  onChange,
  legend = "담당자",
  hint = "여러 명 선택할 수 있어요. 비워두면 미지정이에요.",
  empty = "선택할 수 있는 담당자가 없습니다.",
  disabled = false,
  blocked = () => undefined,
}: {
  readonly legend?: string;
  readonly hint?: string;
  readonly empty?: string;
  /** 목록 전체를 잠근다(예: 일반 업무의 리뷰어). 자리는 그대로 둬 창이 흔들리지 않는다. */
  readonly disabled?: boolean;
  /** 고를 수 없는 사람이면 그 이유. */
  readonly blocked?: (id: string) => string | undefined;
  readonly people: readonly { readonly id: string; readonly name: string }[];
  readonly selected: readonly string[];
  readonly onChange: (ids: readonly string[]) => void;
}) {
  const hintId = useId();
  return (
    <fieldset
      className="task-people"
      disabled={disabled}
      aria-describedby={hintId}
    >
      <legend className="text-sm font-medium">{legend}</legend>
      <p id={hintId} className="mt-1 text-xs text-muted">
        {hint}
      </p>
      {people.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <div className="task-people-list">
          {people.map((person) => {
            const reason = blocked(person.id);
            return (
              <label
                key={person.id}
                className="task-person"
                data-blocked={reason ? true : undefined}
                title={reason}
              >
                <Checkbox
                  checked={selected.includes(person.id)}
                  disabled={!!reason}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...selected, person.id]
                        : selected.filter((id) => id !== person.id),
                    )
                  }
                />
                <span className="min-w-0 truncate">{person.name}</span>
                {reason && <span className="task-person-reason">{reason}</span>}
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
