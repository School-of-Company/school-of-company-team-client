"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react";
import { IconButton } from "./controls";
import { Icon } from "./icons";

type Toast = {
  readonly id: number;
  readonly message: string;
  readonly tone: "success" | "error" | "info";
};
type Notify = (message: string, tone?: Toast["tone"]) => void;
const ToastContext = createContext<Notify | null>(null);

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const regionId = useId();
  const notify = useCallback<Notify>((message, tone = "info") => {
    setToasts((items) => [
      ...items,
      {
        id: items.reduce((max, item) => Math.max(max, item.id), 0) + 1,
        message,
        tone,
      },
    ]);
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        id={regionId}
        aria-label="알림"
        className="fixed right-4 bottom-4 z-50 grid w-[calc(100%-2rem)] max-w-sm gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className="flex items-center justify-between gap-3 rounded-xl bg-surface-raised p-4 shadow-[var(--shadow-overlay)]"
          >
            <p
              className={
                toast.tone === "error" ? "text-sm text-danger" : "text-sm"
              }
            >
              {toast.message}
            </p>
            <IconButton
              variant="ghost"
              aria-label="알림 닫기"
              onClick={() =>
                setToasts((items) =>
                  items.filter((item) => item.id !== toast.id),
                )
              }
            >
              <Icon name="close" />
            </IconButton>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export function useToast(): Notify {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useToast requires ToastProvider");
  return notify;
}
