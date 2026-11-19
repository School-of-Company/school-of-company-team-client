import type { ComponentProps } from "react";

const paths = {
  plus: "M12 5v14 M5 12h14",
  priorityHigh: "M4 20V12h3v8z M10 20V8h3v12z M16 20V4h3v16z",
  priorityMedium: "M4 20V12h3v8z M10 20V8h3v12z M16 20h3",
  priorityLow: "M4 20V12h3v8z M10 20h3 M16 20h3",
  home: "M3 10.5 12 3l9 7.5 M5 9v12h14V9 M10 21v-6h4v6",
  board: "M3 3h18v18H3z M9 3v18 M15 3v18 M3 9h6 M9 15h6 M15 11h6",
  team: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  project: "M3 7h18v14H3z M3 7V3h7l3 4 M3 12h18",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4",
  shield: "M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z M9 12l2 2 4-4",
  chevronDown: "M6 9l6 6 6-6",
  monitor: "M3 4h18v12H3z M8 20h8 M12 16v4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  user: "M20 21v-2a7 7 0 0 0-14 0v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  menu: "M3 6h18 M3 12h18 M3 18h18",
  close: "M6 6l12 12 M18 6 6 18",
  check: "M5 12l4 4L19 6",
  alert: "M12 3 2 21h20L12 3 M12 9v5 M12 17v1",
  merge:
    "M6 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4 M6 7v14 M18 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4 M6 9a9 9 0 0 0 10 7",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M12 7v5l3 2",
  minus: "M5 12h14",
  doc: "M6 3h8l5 5v13H6z M14 3v5h5 M9 13h7 M9 17h7",
  service: "M12 3 3 7.5l9 4.5 9-4.5z M3 12l9 4.5 9-4.5 M3 16.5 12 21l9-4.5",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14 M20 20l-4-4",
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  ...props
}: ComponentProps<"svg"> & { readonly name: IconName }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
