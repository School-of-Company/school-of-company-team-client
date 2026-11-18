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
    <fieldset className="ui-segmented">
      <legend className="sr-only">화면 테마</legend>
      {options.map((option) => (
        <label key={option.value} className="ui-segmented-option">
          <input
            type="radio"
            name="theme-preference"
            value={option.value}
            checked={current === option.value}
            onChange={() => applyThemePreference(option.value)}
          />
          <Icon name={option.icon} width={16} height={16} />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
