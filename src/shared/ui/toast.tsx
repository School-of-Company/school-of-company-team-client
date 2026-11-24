"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./controls";
import { Icon, type IconName } from "./icons";

type Toast = {
  readonly id: number;
  readonly message: string;
  readonly tone: "success" | "error" | "info";
};
type Notify = (message: string, tone?: Toast["tone"]) => void;
const ToastContext = createContext<Notify | null>(null);
function subscribeDialogs(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["open"],
  });
  return () => observer.disconnect();
}
function toastHost() {
  return (
    Array.from(document.querySelectorAll<HTMLDialogElement>("dialog:modal")).at(
      -1,
    ) ?? document.body
  );
}
const icons: Record<Toast["tone"], IconName> = {
  success: "check",
  error: "alert",
  info: "info",
};

function ToastItem({
  toast,
  onRemove,
}: {
  readonly toast: Toast;
  readonly onRemove: (id: number) => void;
}) {
  const [closing, setClosing] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || closing) return;
    const timer = setTimeout(
      () => setClosing(true),
      toast.tone === "error" ? 8000 : 3000,
    );
    return () => clearTimeout(timer);
  }, [toast.tone, paused, closing]);
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => onRemove(toast.id), 200);
    return () => clearTimeout(timer);
  }, [closing, onRemove, toast.id]);
  return (
    <div
      className="ui-toast"
      data-tone={toast.tone}
      data-closing={closing || undefined}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setPaused(false);
      }}
    >
      <span className="ui-toast-icon">
        <Icon name={icons[toast.tone]} />
      </span>
      <p
        role={toast.tone === "error" ? "alert" : "status"}
        aria-live={toast.tone === "error" ? "assertive" : "polite"}
        aria-atomic="true"
      >
        {toast.message}
      </p>
      <IconButton
        variant="ghost"
        aria-label="알림 닫기"
        onClick={() => setClosing(true)}
      >
        <Icon name="close" />
      </IconButton>
    </div>
  );
}

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const nextId = useRef(0);
  const region = useRef<HTMLDivElement>(null);
  const host = useSyncExternalStore(subscribeDialogs, toastHost, () => null);
  const notify = useCallback<Notify>((message, tone = "info") => {
    const id = ++nextId.current;
    setToasts((items) => [...items, { id, message, tone }]);
  }, []);
  const remove = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);
  useLayoutEffect(() => {
    const element = region.current;
    if (!element) return;
    // 새 알림은 모달보다 위에 표시하되 포커스를 옮기지 않는다.
    element.hidePopover();
    if (toasts.length) element.showPopover();
  }, [toasts, host]);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      {host &&
        createPortal(
          <div
            ref={region}
            popover="manual"
            aria-label="알림"
            className="ui-toast-stack"
          >
            {toasts.map((toast) => (
              <ToastItem key={toast.id} toast={toast} onRemove={remove} />
            ))}
          </div>,
          host,
        )}
    </ToastContext.Provider>
  );
}
export function useToast(): Notify {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useToast requires ToastProvider");
  return notify;
}
