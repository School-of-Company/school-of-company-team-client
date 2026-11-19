import type { Attention, AttentionItem, AttentionRule } from "../api/home";
import { attentionRules } from "../api/home";

export const ruleLabels: Readonly<Record<AttentionRule, string>> = {
  OVERDUE: "마감 지남",
  CI_FAILED: "CI 실패",
  REVIEW_OVERDUE: "리뷰 24시간 초과",
  BLOCKED_TOO_LONG: "2일 넘게 막힘",
  HIGH_PRIORITY_UNASSIGNED: "담당자 없는 긴급·높음",
  DUE_SOON: "오늘·내일 마감",
  MERGED_NOT_DONE: "merge됐지만 미완료",
  RULE_MARKED: "자동화 규칙이 표시함",
  SPRINT_ENDING: "스프린트 종료 임박",
};

/** 서버 정렬(규칙 순 → 날짜 → id)을 유지한 채 규칙별로 묶는다. 빈 규칙은 뺀다. */
export function groupByRule(attention: Attention) {
  return attentionRules
    .map((rule) => ({
      rule,
      items: attention.items.filter((item) => item.rule === rule),
    }))
    .filter((group) => group.items.length > 0);
}

const seoulDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Asia/Seoul 기준 날짜(YYYY-MM-DD). 서버 판정과 같은 "오늘". */
export const seoulToday = (at: string | number) =>
  seoulDate.format(new Date(at));

/** `date - today`를 일 수로. 둘 다 YYYY-MM-DD. */
export const daysFrom = (today: string, date: string) =>
  Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);

/** 마감까지 남은 날을 짧게: "오늘 마감", "내일 마감", "3일 지남", "3일 남음". */
export function dueLabel(today: string, date: string) {
  const days = daysFrom(today, date);
  if (days === 0) return "오늘 마감";
  if (days === 1) return "내일 마감";
  if (days > 14)
    return `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;
  return days < 0 ? `${-days}일 지남` : `${days}일 남음`;
}

/** 막힌 기간: 48시간 기준이 보이게 일 단위로 내림. */
export function blockedLabel(since: string, now: number) {
  const days = Math.floor((now - Date.parse(since)) / 86_400_000);
  return `${Math.max(days, 1)}일째 막힘`;
}

export const itemKey = (item: AttentionItem) =>
  [
    item.rule,
    item.task?.id ?? item.sprint?.id,
    item.pullRequest &&
      `${item.pullRequest.repositoryFullName}#${item.pullRequest.number}`,
    item.pullRequest?.reviewerLogin,
  ].join(":") +
  // 같은 업무를 여러 자동화 규칙이 표시할 수 있다(규칙·업무마다 한 항목).
  (item.automationRule ? `:${item.automationRule.id}` : "");
