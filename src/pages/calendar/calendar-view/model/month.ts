import type { CalendarItem } from "./types";
import { routes } from "@/shared/config";

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** "2026-11" → 그 달 1일이 든 주 일요일부터 6주(42칸). 달마다 칸 수가 바뀌지 않게 늘 6주로 그린다. */
export function monthGrid(month: string): string[] {
  const first = `${month}-01`;
  const weekday = new Date(`${first}T00:00:00Z`).getUTCDay();
  const start = addDays(first, -weekday);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function shiftMonth(month: string, by: number): string {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, value - 1 + by, 1));
  return date.toISOString().slice(0, 7);
}

/** 그날에 걸친 항목. 종일·여러 날 항목이 먼저, 그다음 시각 순(서버 정렬을 그날 기준으로 다시 맞춘다). */
export function itemsOn(
  items: readonly CalendarItem[],
  day: string,
): CalendarItem[] {
  return items
    .filter((item) => item.startDate <= day && day <= item.endDate)
    .sort(
      (a, b) =>
        Number(!!a.startTime) - Number(!!b.startTime) ||
        (a.startTime ?? "").localeCompare(b.startTime ?? ""),
    );
}

export const kindLabel: Readonly<Record<CalendarItem["kind"], string>> = {
  EVENT: "일정",
  TASK: "업무 마감",
  MILESTONE: "마일스톤",
  SPRINT: "스프린트",
  EXPERIMENT: "실험",
};

/** 비춘 항목은 원본 화면으로 간다. 일정은 이 화면에서 연다(null). */
export function itemHref(item: CalendarItem): string | null {
  switch (item.kind) {
    case "TASK":
      return routes.task(item.id);
    case "MILESTONE":
      return item.projectId
        ? `${routes.projectMilestones(item.projectId)}?milestone=${encodeURIComponent(item.id)}`
        : null;
    case "SPRINT":
      return item.projectId
        ? routes.projectSprint(item.projectId, item.id)
        : null;
    case "EXPERIMENT":
      return routes.lab(item.id);
    case "EVENT":
      return null;
  }
}

/** "14:00:00" → "14:00". */
export function shortTime(value: string | null): string {
  return value ? value.slice(0, 5) : "";
}
