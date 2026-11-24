"use client";

import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "@/shared/ui";
import { closedGroupsFromStorage, withGroupClosed } from "../model/sidebar";

// 첫 그림은 boot script가 적은 `html[data-sidebar-closed]`로 접는다. 이 속성은 사용자가 바꿀 때(클릭, 다른 탭)만 고친다.
// 수화 중 렌더는 서버 스냅숏(모두 펼침)이라 거기서 속성을 쓰면 접힌 묶음이 한 프레임 펼쳐진다.
const subscribe = (listener: () => void) => {
  const fromOtherTab = () => {
    try {
      document.documentElement.dataset.sidebarClosed =
        closedGroupsFromStorage(localStorage);
    } catch {
      /* Storage became unavailable; React state still hides or shows the group. */
    }
    listener();
  };
  window.addEventListener("storage", fromOtherTab);
  window.addEventListener("sidebar-groups", listener);
  return () => {
    window.removeEventListener("storage", fromOtherTab);
    window.removeEventListener("sidebar-groups", listener);
  };
};

export function SidebarGroup({
  title,
  group,
  children,
}: {
  readonly title: string;
  readonly group: string;
  readonly children: ReactNode;
}) {
  const id = useId();
  const key = `soc.sidebar.group.${group}`;
  const saved = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) === "true";
      } catch {
        return false;
      }
    },
    () => false,
  );
  const [override, setOverride] = useState<boolean | null>(null);
  const closed = override ?? saved;
  return (
    <nav aria-label={title} data-group={group} className="sidebar-group grid">
      <h2>
        <button
          type="button"
          aria-expanded={!closed}
          aria-controls={id}
          className="sidebar-group-toggle"
          onClick={() => {
            const dataset = document.documentElement.dataset;
            dataset.sidebarClosed = withGroupClosed(
              dataset.sidebarClosed,
              group,
              !closed,
            );
            setOverride(!closed);
            try {
              localStorage.setItem(key, String(!closed));
              setOverride(null);
              window.dispatchEvent(new Event("sidebar-groups"));
            } catch {
              /* Keep this preference in memory when storage is unavailable. */
            }
          }}
        >
          <span>{title}</span>
          <Icon
            name="chevronDown"
            className={closed ? "-rotate-90" : undefined}
            width={14}
            height={14}
          />
        </button>
      </h2>
      <div id={id} hidden={closed}>
        {children}
      </div>
    </nav>
  );
}
