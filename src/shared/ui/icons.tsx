import type { ComponentProps } from "react";

const paths = {
  board: "M3 3h18v18H3z M9 3v18 M15 3v18 M3 9h6 M9 15h6 M15 11h6",
  team: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  project: "M3 7h18v14H3z M3 7V3h7l3 4 M3 12h18",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
  user: "M20 21v-2a7 7 0 0 0-14 0v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  menu: "M3 6h18 M3 12h18 M3 18h18",
  close: "M6 6l12 12 M18 6 6 18",
  check: "M5 12l4 4L19 6",
  alert: "M12 3 2 21h20L12 3 M12 9v5 M12 17v1",
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
