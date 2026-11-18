"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  statusLabels,
  taskStatuses,
  type TaskCard,
  type TaskStatus,
} from "@/entities/task";
import { IconButton } from "@/shared/ui";

export function BoardCardMenu({
  task,
  editable,
  manual,
  pending,
  onMove,
  onOrder,
}: {
  readonly task: TaskCard;
  readonly editable: boolean;
  readonly manual: boolean;
  readonly pending: boolean;
  readonly onMove: (status: TaskStatus) => void;
  readonly onOrder: (direction: "up" | "down") => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuEdge = useRef<"first" | "last">("first");
  useEffect(() => {
    if (!open) return;
    const items = menu.current?.querySelectorAll<HTMLElement>(
      "[role='menuitem']:not(:disabled)",
    );
    items?.[menuEdge.current === "last" ? items.length - 1 : 0]?.focus();
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div
      ref={root}
      className="relative z-10 shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <IconButton
        ref={trigger}
        aria-label={task.title + " 더보기"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        variant="ghost"
        onClick={() => {
          menuEdge.current = "first";
          setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            menuEdge.current = event.key === "ArrowUp" ? "last" : "first";
            setOpen(true);
          }
        }}
      >
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </IconButton>
      {open && (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label={task.title + " 작업"}
          className="absolute top-full right-0 z-20 grid w-52 rounded-md border border-border bg-surface p-1 shadow-md"
          onKeyDown={(event) => {
            if (event.key === "Tab") {
              close();
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
              return;
            }
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                "[role='menuitem']:not(:disabled)",
              ),
            );
            const index = items.findIndex(
              (item) => item === document.activeElement,
            );
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : (index +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      items.length) %
                    items.length;
            items[next]?.focus();
          }}
        >
          {editable && (
            <>
              {taskStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  disabled={
                    pending ||
                    task.status === status ||
                    (task.type === "TASK" && status === "REVIEW")
                  }
                  className="min-h-11 rounded-sm px-3 text-left text-sm hover:bg-surface-hover disabled:cursor-not-allowed disabled:text-muted"
                  onClick={() => {
                    onMove(status);
                    close();
                  }}
                >
                  상태 변경: {statusLabels[status]}
                </button>
              ))}
              {(["up", "down"] as const).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  disabled={pending || !manual}
                  title={
                    !manual ? "수동 순서에서 사용할 수 있습니다" : undefined
                  }
                  className="min-h-11 rounded-sm px-3 text-left text-sm hover:bg-surface-hover disabled:cursor-not-allowed disabled:text-muted"
                  onClick={() => {
                    onOrder(direction);
                    close();
                  }}
                >
                  {direction === "up" ? "위로 이동" : "아래로 이동"}
                </button>
              ))}
            </>
          )}
          <Link
            role="menuitem"
            tabIndex={-1}
            href={
              task.projectId
                ? `/projects/${encodeURIComponent(task.projectId)}`
                : task.scope === "PERSONAL"
                  ? "/me?source=PERSONAL"
                  : "/team"
            }
            className="flex min-h-11 items-center rounded-sm px-3 text-sm hover:bg-surface-hover"
            onClick={close}
          >
            출처로 이동
          </Link>
        </div>
      )}
    </div>
  );
}
