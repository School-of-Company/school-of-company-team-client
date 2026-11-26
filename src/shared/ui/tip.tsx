"use client";

import { useId, type ReactNode } from "react";
import { Icon } from "./icons";

/** 정보 아이콘. 설명은 마우스를 올리거나 초점을 줄 때 말풍선으로 보인다(문단 대신). */
export function InfoTip({
  label,
  children,
  align = "start",
}: {
  /** 아이콘 버튼의 이름(스크린 리더). */
  readonly label: string;
  readonly children: ReactNode;
  readonly align?: "start" | "end";
}) {
  const id = useId();
  return (
    <span className="ui-tip" data-align={align}>
      <button
        type="button"
        className="ui-tip-button"
        aria-label={label}
        aria-describedby={id}
      >
        <Icon name="info" />
      </button>
      <span id={id} role="tooltip" className="ui-tip-bubble">
        {children}
      </span>
    </span>
  );
}

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
