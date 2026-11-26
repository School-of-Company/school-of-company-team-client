"use client";

import { useId, useRef, type ReactNode } from "react";
import { useAnchoredPosition } from "./anchored-position";
import { Icon } from "./icons";

/**
 * 설명 문구를 ⓘ 버튼 뒤에 둔다. 누르면 버튼 옆에 떠서 본문을 밀지 않는다.
 * 제목, 라벨 안에도 넣을 수 있게 span 이다. 줄을 나눌 때는 `<span className="block">` 을 쓴다.
 */
export function InfoTip({
  label,
  children,
}: {
  /** 버튼 이름(예: "권한 설명"). */
  readonly label: string;
  readonly children: ReactNode;
}) {
  const id = `info-${useId().replace(/:/g, "")}`;
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLSpanElement>(null);
  useAnchoredPosition(trigger, panel, { align: "start" });
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="ui-info-button"
        popoverTarget={id}
        aria-label={label}
      >
        <Icon name="info" />
      </button>
      <span ref={panel} id={id} popover="auto" className="ui-info-panel">
        {children}
      </span>
    </>
  );
}
