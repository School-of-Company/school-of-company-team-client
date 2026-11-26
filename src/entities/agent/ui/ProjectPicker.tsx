import { Checkbox } from "@/shared/ui";

/** 높이를 고정한 프로젝트 체크 목록. `max` 에 닿으면 고르지 않은 칸을 막는다. */
export function ProjectPicker({
  id,
  label,
  options,
  selected,
  onChange,
  max,
  disabled = false,
  describedBy,
}: {
  readonly id: string;
  readonly label: string;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
  }[];
  readonly selected: readonly string[];
  readonly onChange: (selected: readonly string[]) => void;
  readonly max?: number;
  readonly disabled?: boolean;
  readonly describedBy?: string;
}) {
  const full = max !== undefined && selected.length >= max;
  return (
    <fieldset
      className="grid gap-2"
      aria-describedby={describedBy}
      disabled={disabled}
    >
      <legend className="sr-only">{label}</legend>
      <div id={id} className="agent-project-picker">
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label key={option.value}>
              <Checkbox
                checked={checked}
                disabled={!checked && full}
                onChange={() =>
                  onChange(
                    checked
                      ? selected.filter((value) => value !== option.value)
                      : [...selected, option.value],
                  )
                }
              />
              <span className="min-w-0 truncate">{option.label}</span>
            </label>
          );
        })}
      </div>
      <p className="text-xs text-muted" aria-live="polite">
        {max === undefined
          ? `${selected.length}개 고름`
          : `${selected.length}개 고름, 최대 ${max}개`}
      </p>
    </fieldset>
  );
}
