/** 라디오 세그먼트. 막힌 칸은 `blocked`(이유)를 title 로 보이고 고를 수 없게 한다. */
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
        <label
          key={option.value}
          className="ui-segmented-option"
          title={option.blocked}
        >
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
      ))}
    </div>
  );
}
