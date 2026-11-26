"use client";

import { useId, useRef, type ReactNode } from "react";
import { useAnchoredPosition } from "./anchored-position";
import { Icon } from "./icons";

/**
 * 늘 보일 필요는 없는 설명을 담는 작은 i 버튼. 누르면 버튼 옆에 설명이 뜨고,
 * 화면 낭독기는 버튼에 포커스할 때 같은 설명을 읽는다(aria-describedby).
 */
export function InfoTip({
  label,
  children,
}: {
  /** 버튼 이름. 예: "사이클 타임 설명" */
  readonly label: string;
  readonly children: ReactNode;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useAnchoredPosition(trigger, panel, { align: "start" });
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="ui-info-tip"
        popoverTarget={id}
        aria-label={label}
        aria-describedby={id}
      >
        <Icon name="info" width={16} height={16} />
      </button>
      <div ref={panel} id={id} popover="auto" className="ui-info-panel">
        {children}
      </div>
    </>
  );
}
