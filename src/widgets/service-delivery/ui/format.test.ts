import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDuration, shortSha } from "./format";

test("deployment durations read in Korean units and running ones have none", () => {
  const start = "2026-11-18T11:03:00Z";
  assert.equal(formatDuration(start, "2026-11-18T11:03:40Z"), "40초");
  assert.equal(formatDuration(start, "2026-11-18T11:05:10Z"), "2분 10초");
  assert.equal(formatDuration(start, "2026-11-18T12:33:00Z"), "1시간 30분");
  assert.equal(formatDuration(start, null), null);
  assert.equal(shortSha("be78fa5da153318c"), "be78fa5");
});
