"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  statusLabels,
  taskStatuses,
  type TaskCard,
  type TaskStatus,
} from "@/entities/task";
import { Icon, IconButton } from "@/shared/ui";
import { menuPosition } from "../model/menu-position";

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
  // 메뉴는 popover(top layer)로 띄워 보드의 가로 스크롤 영역에 잘리지 않는다.
  // DOM 위치는 그대로라 포커스, 바깥 클릭, Tab 닫기는 지금처럼 root 기준으로 동작한다.
  useLayoutEffect(() => {
    const element = menu.current;
    const button = trigger.current;
    if (!open || !element || !button) return;
    if (typeof element.showPopover === "function") element.showPopover();
    function place() {
      if (!element || !button) return;
      const anchor = button.getBoundingClientRect();
      const size = element.getBoundingClientRect();
      const { top, left } = menuPosition(anchor, size, {
        width: window.innerWidth,
        height: window.innerHeight,
      });
      element.style.top = `${top}px`;
      element.style.left = `${left}px`;
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const items = menu.current?.querySelectorAll<HTMLElement>(
      "[role^='menuitem']:not(:disabled)",
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
          popover="manual"
          aria-label={task.title + " 작업"}
          className="board-menu"
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
                "[role^='menuitem']:not(:disabled)",
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
              <p className="board-menu-label" aria-hidden="true">
                상태 바꾸기
              </p>
              <div role="group" aria-label="상태 바꾸기">
                {taskStatuses.map((status) => {
                  const current = task.status === status;
                  const blocked = task.type === "TASK" && status === "REVIEW";
                  return (
                    <button
                      key={status}
                      type="button"
                      role="menuitemradio"
                      aria-checked={current}
                      tabIndex={-1}
                      disabled={pending || current || blocked}
                      title={
                        blocked
                          ? "개발 업무만 리뷰로 옮길 수 있어요"
                          : undefined
                      }
                      className="board-menu-item"
                      onClick={() => {
                        onMove(status);
                        close();
                      }}
                    >
                      <span
                        className="status-icon"
                        data-status={status}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {statusLabels[status]}
                      </span>
                      {current && <Icon name="check" width={16} height={16} />}
                    </button>
                  );
                })}
              </div>
              <hr className="board-menu-divider" />
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
                  className="board-menu-item"
                  onClick={() => {
                    onOrder(direction);
                    close();
                  }}
                >
                  <Icon
                    name="chevronDown"
                    width={16}
                    height={16}
                    className={direction === "up" ? "rotate-180" : undefined}
                  />
                  {direction === "up" ? "위로 올리기" : "아래로 내리기"}
                </button>
              ))}
              <hr className="board-menu-divider" />
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
            className="board-menu-item"
            onClick={close}
          >
            <Icon
              name={task.projectId ? "project" : "board"}
              width={16}
              height={16}
            />
            {task.projectId ? "프로젝트 보드 열기" : "출처 보드 열기"}
          </Link>
        </div>
      )}
    </div>
  );
}
