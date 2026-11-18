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

test("표시는 서울 시각 24시간제", () => {
  assert.match(formatDateTime("2026-11-19T04:05:00Z"), /13:05/);
  assert.equal(formatDateTime(null), "—");
});
