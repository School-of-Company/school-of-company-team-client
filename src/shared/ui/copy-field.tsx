"use client";

import { useState } from "react";
import { Button, Input, Textarea } from "./controls";

/** 읽기 전용 값과 복사 버튼. 복사에 실패하면 직접 고를 수 있게 입력란을 남긴다. */
export function CopyField({
  id,
  label,
  value,
  multiline = false,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly multiline?: boolean;
}) {
  const [copied, setCopied] = useState<"ok" | "failed" | null>(null);
  const props = {
    id,
    readOnly: true,
    value,
    spellCheck: false,
    className: "min-w-0 flex-1 font-mono text-xs",
    onFocus: (event: { currentTarget: { select: () => void } }) =>
      event.currentTarget.select(),
  };
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex flex-wrap items-start gap-2">
        {multiline ? <Textarea rows={3} {...props} /> : <Input {...props} />}
        <Button
          variant="secondary"
          onClick={() =>
            void navigator.clipboard.writeText(value).then(
              () => setCopied("ok"),
              () => setCopied("failed"),
            )
          }
        >
          복사
        </Button>
      </div>
      {copied && (
        <p role="status" className="text-xs text-muted">
          {copied === "ok"
            ? "복사했습니다."
            : "복사하지 못했습니다. 입력란을 선택해 직접 복사하세요."}
        </p>
      )}
    </div>
  );
}
