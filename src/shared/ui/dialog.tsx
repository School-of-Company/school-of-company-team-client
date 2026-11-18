"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconButton } from "./controls";
import { Icon } from "./icons";
import { restoreFocus } from "./focus-return";

export function Dialog({
  open,
  onClose,
  title,
  children,
  className = "",
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // 열기 직전 포커스(보통 연 버튼). 대화상자 안 요소면 연 곳을 알 수 없어 본문으로 돌린다.
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const active = document.activeElement;
      opener.current =
        active instanceof HTMLElement &&
        active !== document.body &&
        !dialog.contains(active)
          ? active
          : null;
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
      restoreFocus(opener.current);
      opener.current = null;
    }
  }, [open]);
  // 호출부가 조건부 렌더로 열린 채 언마운트하면 위 분기를 거치지 않는다. 그때 돌려준다.
  // (개발 모드 StrictMode 의 가짜 언마운트에서는 대화상자가 아직 모달이라 바깥 포커스가 막혀 아무 일도 없다.)
  useEffect(
    () => () => {
      restoreFocus(opener.current);
    },
    [],
  );
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflowY;
    document.body.style.overflowY = "clip";
    return () => {
      document.body.style.overflowY = overflow;
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const elements = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])",
          ),
        ).filter(
          (element) =>
            element.tabIndex >= 0 && element.getClientRects().length > 0,
        );
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onClose();
      }}
      onClose={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={`ui-dialog ${className}`}
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <IconButton aria-label="닫기" variant="ghost" onClick={onClose}>
          <Icon name="close" />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}
