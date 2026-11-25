import { normalizeApiError } from "@/shared/api";
import type { StatsRange, WeekCount } from "./types";

export const ranges: readonly { value: StatsRange; label: string }[] = [
  { value: "4w", label: "4주" },
  { value: "12w", label: "12주" },
  { value: "26w", label: "26주" },
];
export const DEFAULT_RANGE: StatsRange = "12w";

export const parseRange = (value: string | null | undefined): StatsRange =>
  ranges.find((item) => item.value === value)?.value ?? DEFAULT_RANGE;

/** 시간 값(소수 첫째 자리 시간). 48시간부터는 일로 읽는다. 표본이 없으면 "–". */
export function formatHours(hours: number | null): string {
  if (hours === null) return "–";
  if (hours < 48) return `${Math.round(hours * 10) / 10}시간`;
  return `${Math.round((hours / 24) * 10) / 10}일`;
}

export const formatRate = (value: number | null) =>
  value === null ? "–" : `${Math.round(value * 100)}%`;

export const formatNumber = (value: number | null) =>
  value === null ? "–" : String(Math.round(value * 10) / 10);

/** "2026-11-23" → "11월 23일" (시간대 영향 없이 날짜 문자열을 그대로 읽는다). */
export function weekLabel(weekStart: string): string {
  const [, month, day] = weekStart.split("-").map(Number);
  return `${month}월 ${day}일`;
}

/** 주별 막대의 글 요약: 합계, 주 평균, 가장 많은 주. */
export function weeklySummary(weeks: readonly WeekCount[], unit: string) {
  const total = weeks.reduce((sum, week) => sum + week.count, 0);
  if (weeks.length === 0 || total === 0) return `${weeks.length}주 동안 없음`;
  const peak = weeks.reduce((top, week) =>
    week.count > top.count ? week : top,
  );
  const average = Math.round((total / weeks.length) * 10) / 10;
  return `${weeks.length}주 동안 ${total}${unit}, 주 평균 ${average}${unit}, 가장 많은 주는 ${weekLabel(peak.weekStart)} 주 ${peak.count}${unit}`;
}

const messages: Readonly<Record<string, string>> = {
  PROJECT_NOT_FOUND:
    "프로젝트를 찾을 수 없습니다. 프로젝트 필터를 전체로 바꿔 보세요.",
  INVALID_PARAMETER: "기간 값이 올바르지 않습니다. 기간을 다시 고르세요.",
  ONBOARDING_REQUIRED: "가입 승인과 Discord 연결을 완료한 뒤 이용해 주세요.",
};

export function statsErrorMessage(error: unknown): string {
  const problem = normalizeApiError(error);
  return messages[problem.code] ?? problem.message;
}
