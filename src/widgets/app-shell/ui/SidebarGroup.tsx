"use client";

import {
  useId,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Icon } from "@/shared/ui";

const subscribe = (listener: () => void) => {
  window.addEventListener("storage", listener);
  window.addEventListener("sidebar-groups", listener);
  return () => {
    window.removeEventListener("storage", listener);
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
  // 첫 그림은 boot script가 적은 `html[data-sidebar-closed]`로 접는다. 그 뒤로는 이 묶음의 상태를 그 속성에 맞춰 둔다.
  useLayoutEffect(() => {
    const dataset = document.documentElement.dataset;
    const groups = new Set((dataset.sidebarClosed ?? "").split(" "));
    groups.delete("");
    if (closed) groups.add(group);
    else groups.delete(group);
    dataset.sidebarClosed = [...groups].join(" ");
  }, [closed, group]);
  return (
    <nav aria-label={title} data-group={group} className="sidebar-group grid">
      <h2>
        <button
          type="button"
          aria-expanded={!closed}
          aria-controls={id}
          className="sidebar-group-toggle"
          onClick={() => {
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
