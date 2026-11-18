"use client";

import { useSyncExternalStore } from "react";
import { applyTheme, readTheme, subscribeTheme } from "@/shared/lib";
import { IconButton } from "./controls";
import { Icon } from "./icons";

const serverTheme = () => null;

export function ThemeToggle({ className }: { readonly className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);
  const dark = theme === "dark";
  return (
    <IconButton
      variant="ghost"
      aria-label="다크 모드"
      aria-pressed={theme === null ? undefined : dark}
      title={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className={className}
      onClick={() => applyTheme(dark ? "light" : "dark")}
    >
      <Icon name={dark ? "sun" : "moon"} />
    </IconButton>
  );
}
