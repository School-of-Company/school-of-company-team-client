import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDuration, impactMinutes } from "./types";

test("영향 시간은 해결 시각까지 분을 센다", () => {
  assert.equal(
    impactMinutes({
      startedAt: "2026-11-19T13:05:00+09:00",
      resolvedAt: "2026-11-19T14:40:30+09:00",
    }),
    95,
  );
});

test("미해결이면 지금까지 세고, 시계가 뒤로 가도 0 아래로 내려가지 않는다", () => {
  const start = Date.parse("2026-11-19T13:05:00+09:00");
  const open = { startedAt: "2026-11-19T13:05:00+09:00", resolvedAt: null };
  assert.equal(impactMinutes(open, start + 10 * 60_000), 10);
  assert.equal(impactMinutes(open, start - 60_000), 0);
});

test("기간은 분·시간·일 단위로 줄인다", () => {
  assert.equal(formatDuration(0), "0분");
  assert.equal(formatDuration(59), "59분");
  assert.equal(formatDuration(60), "1시간");
  assert.equal(formatDuration(95), "1시간 35분");
  assert.equal(formatDuration(24 * 60), "1일");
  assert.equal(formatDuration(26 * 60 + 5), "1일 2시간");
});
