"use client";

import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
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
  return (
    <nav aria-label={title} className="sidebar-group grid">
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
