import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatHours,
  formatRate,
  parseRange,
  weekLabel,
  weeklySummary,
} from "./format";

test("기간은 4w, 12w, 26w 만 받고 나머지는 기본 12w", () => {
  assert.equal(parseRange("4w"), "4w");
  assert.equal(parseRange("26w"), "26w");
  assert.equal(parseRange("8w"), "12w");
  assert.equal(parseRange(null), "12w");
});

test("시간은 48시간 미만은 시간, 이상은 일, 표본 없음은 대시", () => {
  assert.equal(formatHours(null), "–");
  assert.equal(formatHours(5.24), "5.2시간");
  assert.equal(formatHours(47.9), "47.9시간");
  assert.equal(formatHours(52), "2.2일");
  assert.equal(formatRate(null), "–");
  assert.equal(formatRate(0.054), "5%");
});

test("주 이름은 시간대와 무관하게 날짜 문자열을 그대로 읽는다", () => {
  assert.equal(weekLabel("2026-09-07"), "9월 7일");
});

test("주별 요약은 합계, 평균, 가장 많은 주를 말한다", () => {
  assert.equal(
    weeklySummary(
      [
        { weekStart: "2026-11-09", count: 1 },
        { weekStart: "2026-11-16", count: 4 },
        { weekStart: "2026-11-23", count: 2 },
      ],
      "개",
    ),
    "3주 동안 7개, 주 평균 2.3개, 가장 많은 주는 11월 16일 주 4개",
  );
  assert.equal(
    weeklySummary([{ weekStart: "2026-11-23", count: 0 }], "건"),
    "1주 동안 없음",
  );
});
