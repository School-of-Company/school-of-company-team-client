import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  addMonths,
  clampDate,
  isOutOfRange,
  latestDate,
  monthGrid,
  todayIso,
} from "./date";

test("today is the Seoul calendar day", () => {
  assert.equal(todayIso(Date.parse("2026-11-23T15:30:00Z")), "2026-11-24");
  assert.equal(todayIso(Date.parse("2026-11-23T14:59:00Z")), "2026-11-23");
});

test("day and month steps cross month, year and leap boundaries", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2028-01-31", 1), "2028-02-29");
  assert.equal(addMonths("2026-01-15", -1), "2025-12-15");
});

test("month grid starts on Sunday and covers six weeks", () => {
  const grid = monthGrid("2026-11-24");
  assert.equal(grid.length, 42);
  assert.equal(grid[0], "2026-11-01"); // 2026-11-01 is a Sunday
  assert.equal(monthGrid("2026-12-10")[0], "2026-11-29");
});

test("min and max disable and clamp days", () => {
  const bounds = { min: "2026-11-24", max: "2026-12-31" };
  assert.equal(isOutOfRange("2026-11-23", bounds), true);
  assert.equal(isOutOfRange("2026-11-24", bounds), false);
  assert.equal(isOutOfRange("2027-01-01", bounds), true);
  assert.equal(isOutOfRange("2020-01-01", {}), false);
  assert.equal(clampDate("2026-01-01", bounds), "2026-11-24");
  assert.equal(clampDate("2027-05-01", bounds), "2026-12-31");
  assert.equal(latestDate("2026-11-24", "", "2026-12-01"), "2026-12-01");
  assert.equal(latestDate("", null), undefined);
});
