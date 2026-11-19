import { formatDate } from "@/shared/lib";

const short = { year: undefined, month: "short", day: "numeric" } as const;

/** `2026-11-16` 두 개 → "11월 16일 – 11월 27일". 해가 다르면 연도를 붙인다. */
export function formatRange(start: string, end: string) {
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  const options = sameYear
    ? short
    : ({ month: "short", day: "numeric" } as const);
  return `${formatDate(start, options)} – ${formatDate(end, options)}`;
}

/** 종료일까지 남은 날(오늘 포함 기준, 음수면 지남). 날짜 문자열끼리 계산해 시간대 영향이 없다. */
export function daysLeft(endDate: string, today: string) {
  return Math.round(
    (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      86_400_000,
  );
}

export function remainingLabel(endDate: string, today: string) {
  const days = daysLeft(endDate, today);
  if (days > 0) return `종료까지 ${days}일`;
  if (days === 0) return "오늘 종료";
  return `종료일 ${-days}일 지남`;
}
