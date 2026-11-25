import { useState } from "react";
import { Label, Markdown, Textarea } from "@/shared/ui";

export function SprintGoalEditor({
  id,
  value,
  onChange,
  error,
  max = 500,
}: {
  readonly id: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  /** 마일스톤 목표는 2000자(s15). */
  readonly max?: number;
}) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>목표</Label>
        <div className="ui-segmented" role="group" aria-label="목표 보기">
          {(["write", "preview"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className="ui-segmented-option"
              aria-pressed={mode === item}
              onClick={() => setMode(item)}
            >
              {item === "write" ? "작성" : "미리보기"}
            </button>
          ))}
        </div>
      </div>
      <Textarea
        id={id}
        name="goal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={max}
        hidden={mode === "preview"}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error ${id}-hint` : `${id}-hint`}
      />
      {mode === "preview" && (
        <div className="min-h-28 rounded-xl bg-surface-box p-4">
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-sm text-muted">미리 볼 내용이 없습니다.</p>
          )}
        </div>
      )}
      <div
        id={`${id}-hint`}
        className="flex flex-wrap justify-between gap-2 text-xs text-muted"
      >
        <span>마크다운을 지원합니다.</span>
        <span className="tabular-nums">
          {value.length}/{max}자
        </span>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
