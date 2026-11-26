import { DisabledReason } from "./disabled-reason";

/** 라디오 세그먼트. 막힌 칸은 고를 수 없고 `blocked`(이유)를 비활성 이유 말풍선으로 보인다. */
export function SegmentedRadio<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
  disabled,
  describedBy,
}: {
  readonly name: string;
  readonly label: string;
  readonly value: T;
  readonly options: readonly {
    readonly value: T;
    readonly label: string;
    readonly blocked?: string;
  }[];
  readonly onChange: (value: T) => void;
  readonly disabled: boolean;
  readonly describedBy?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-describedby={describedBy}
      className="ui-segmented"
    >
      {options.map((option) => (
        <DisabledReason
          key={option.value}
          reason={option.blocked}
          align="start"
        >
          <label className="ui-segmented-option">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={disabled || !!option.blocked}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        </DisabledReason>
      ))}
    </div>
  );
}
