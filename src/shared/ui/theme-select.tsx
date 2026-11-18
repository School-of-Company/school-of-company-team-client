"use client";

import { useSyncExternalStore } from "react";
import {
  applyThemePreference,
  readThemePreference,
  subscribeTheme,
  type ThemePreference,
} from "@/shared/lib";
import { Icon, type IconName } from "./icons";

const options: readonly {
  value: ThemePreference;
  label: string;
  icon: IconName;
}[] = [
  { value: "system", label: "시스템", icon: "monitor" },
  { value: "light", label: "라이트", icon: "sun" },
  { value: "dark", label: "다크", icon: "moon" },
];

const serverPreference = () => null;

export function ThemeSelect() {
  const current = useSyncExternalStore(
    subscribeTheme,
    readThemePreference,
    serverPreference,
  );
  return (
    <fieldset className="ui-theme-select">
      <legend className="sr-only">화면 테마</legend>
      {options.map((option) => (
        <label key={option.value} className="ui-theme-option">
          <input
            type="radio"
            name="theme-preference"
            value={option.value}
            checked={current === option.value}
            onChange={() => applyThemePreference(option.value)}
          />
          <span
            className="ui-theme-preview"
            data-preview={option.value}
            aria-hidden="true"
          >
            <span className="ui-theme-preview-side" />
            <span className="ui-theme-preview-main">
              <span />
              <span />
              <span />
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name={option.icon} width={16} height={16} />
            {option.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
