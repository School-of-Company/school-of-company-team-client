"use client";

import { useId, type ReactNode } from "react";

/**
 * 비활성 컨트롤과 그 이유. 비활성 버튼은 초점을 받지 않으므로 감싼 자리가 초점과 말풍선을 맡는다.
 * reason 이 없으면 children 만 그린다.
 */
export function DisabledReason({
  reason,
  children,
  align = "end",
}: {
  readonly reason: string | null | undefined;
  readonly children: ReactNode;
  readonly align?: "start" | "end";
}) {
  const id = useId();
  if (!reason) return children;
  return (
    <span className="ui-tip" data-align={align}>
      <span tabIndex={0} className="ui-tip-disabled" aria-describedby={id}>
        {children}
      </span>
      <span id={id} role="tooltip" className="ui-tip-bubble">
        {reason}
      </span>
    </span>
  );
}
