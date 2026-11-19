import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDateTime, fromLocalInput, toLocalInput } from "./time";

test("datetime-local 왕복은 분 단위로 같은 시각이다", () => {
  const iso = "2026-11-19T04:05:00.000Z";
  assert.equal(fromLocalInput(toLocalInput(iso)), iso);
});

test("빈 값·잘못된 값은 undefined, 잘못된 ISO는 빈 문자열", () => {
  assert.equal(fromLocalInput(""), undefined);
  assert.equal(fromLocalInput("not-a-date"), undefined);
  assert.equal(toLocalInput("nope"), "");
});

test("표시는 서울 시각 24시간제, 올해면 연도를 뺀다", () => {
  const now = new Date("2026-12-01T00:00:00Z");
  const thisYear = formatDateTime("2026-11-19T04:05:00Z", now);
  assert.match(thisYear, /13:05/);
  assert.doesNotMatch(thisYear, /2026/);
  // 서울 기준 연도: UTC 2025-12-31 16:00 은 서울 2026-01-01 01:00 이라 올해로 본다.
  assert.equal(formatDateTime("2025-12-31T16:00:00Z", now), "1월 1일 01:00");
  assert.match(formatDateTime("2025-06-01T00:00:00Z", now), /2025/);
  assert.equal(formatDateTime(null, now), "—");
});
