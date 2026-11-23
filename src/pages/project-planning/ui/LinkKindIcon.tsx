import type { ComponentProps } from "react";
import type { LinkKind } from "../model/links";

// ponytail: 종류마다 내장 선 아이콘. 파비콘을 외부에서 불러오지 않는다(P-7: 팀원 IP가 제3자 사이트에 남는다).
const paths: Readonly<Record<LinkKind, string>> = {
  NOTION: "M5 4h14v16H5z M9 16V8l6 8V8",
  FIGMA:
    "M9 3h6a3 3 0 0 1 0 6H9a3 3 0 0 1 0-6z M12 3v12 M9 9h3v6H9a3 3 0 0 1 0-6z M18 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M9 15h3v3a3 3 0 1 1-3-3z",
  GOOGLE_DOCS: "M6 3h8l5 5v13H6z M14 3v5h5 M9 13h7 M9 17h7",
  GOOGLE_SHEETS: "M6 3h8l5 5v13H6z M14 3v5h5 M9 12h7v6H9z M9 15h7 M12.5 12v6",
  GOOGLE_SLIDES: "M6 3h8l5 5v13H6z M14 3v5h5 M9 12h7v5H9z",
  GOOGLE_DRIVE: "M9 4h6l6.5 11-3 5h-13l-3-5z M2.5 15h19 M9 4l6.5 11",
  GITHUB: "M8 8l-4 4 4 4 M16 8l4 4-4 4 M14 5l-4 14",
  YOUTUBE:
    "M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z M10 9v6l5-3z",
  MIRO: "M4 4h16v16H4z M8 8h4v4H8z M14 12h2 M8 16h8",
  OTHER:
    "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
};

export function LinkKindIcon({
  kind,
  ...props
}: ComponentProps<"svg"> & { readonly kind: LinkKind }) {
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
      <path d={paths[kind] ?? paths.OTHER} />
    </svg>
  );
}
