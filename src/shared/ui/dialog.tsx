"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { IconButton } from "./controls";
import { Icon } from "./icons";
import { restoreFocus } from "./focus-return";

/**
 * `open` prop 과 네이티브 dialog 를 맞추는 판정. Chromium 은 사용자 활성화 없이 연달아 온 두 번째 Esc 의
 * cancel 을 막을 수 없게 두어, 호출부가 닫기를 거부해도(`open` 이 true 그대로) 네이티브 dialog 는 닫힌다.
 * 그때도 다시 열어야 한다. 이미 보였던 것을 다시 여는 경우(`shown`)는 연 곳(opener)을 새로 잡지 않는다.
 */
export function dialogSync(state: {
  readonly open: boolean;
  readonly nativeOpen: boolean;
  readonly shown: boolean;
}): "show" | "reshow" | "hide" | null {
  if (state.open && !state.nativeOpen) return state.shown ? "reshow" : "show";
  if (!state.open && state.shown) return "hide";
  return null;
}

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
  // 실제로 열려 있었는지. 닫힌 채 언마운트되는 대화상자가 남의 포커스를 빼앗지 않게 한다.
  const shown = useRef(false);
  // 네이티브 dialog 가 스스로 닫힌 횟수. 호출부가 닫기를 거부해 `open` 이 그대로여도 아래 effect 를 다시 돌린다.
  const [nativeCloses, setNativeCloses] = useState(0);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const sync = dialogSync({
      open,
      nativeOpen: dialog.open,
      shown: shown.current,
    });
    if (sync === "show") {
      const active = document.activeElement;
      opener.current =
        active instanceof HTMLElement &&
        active !== document.body &&
        !dialog.contains(active)
          ? active
          : null;
    }
    if (sync === "show" || sync === "reshow") {
      dialog.showModal();
      shown.current = true;
    }
    if (sync === "hide") {
      if (dialog.open) dialog.close();
      shown.current = false;
      restoreFocus(opener.current);
      opener.current = null;
    }
  }, [open, nativeCloses]);
  // 숨김·언마운트. Next.js(Cache Components)는 떠난 화면을 언마운트하지 않고 숨겨 두는데(Activity hidden),
  // 그 화면의 대화상자가 열린 채 남으면 보이지 않는 모달이 문서 전체를 막는다(V-route-focus H1).
  // 그래서 effect 가 정리될 때 onClose 를 부르지 않고 조용히 닫는다(호출부 상태·URL 은 그대로).
  // 다시 보이면 위 effect 가 open 값대로 다시 연다. 열린 채 조건부 렌더로 사라질 때 포커스도 여기서 돌려준다.
  const silent = useRef(false);
  useEffect(() => {
    const dialog = ref.current;
    return () => {
      if (dialog?.open) {
        silent.current = true;
        dialog.close();
      }
      if (shown.current) restoreFocus(opener.current);
      shown.current = false;
    };
  }, []);
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
        if (event.target !== event.currentTarget) return;
        // 숨김·언마운트로 조용히 닫은 것은 호출부에 알리지 않는다.
        if (silent.current) {
          silent.current = false;
          return;
        }
        setNativeCloses((count) => count + 1);
        onClose();
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
