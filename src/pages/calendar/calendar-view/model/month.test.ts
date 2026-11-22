import assert from "node:assert/strict";
import { test } from "node:test";
import type { CalendarItem } from "./types";
import { itemsOn, monthGrid, shiftMonth } from "./month";

const item = (over: Partial<CalendarItem>): CalendarItem => ({
  kind: "EVENT",
  id: "E",
  title: "회의",
  startDate: "2026-11-10",
  endDate: "2026-11-10",
  startTime: null,
  endTime: null,
  projectId: null,
  projectKey: null,
  taskKey: null,
  status: null,
  description: null,
  createdBy: null,
  canEdit: false,
  ...over,
});

test("month grid starts on the Sunday of the first week and is always 6 weeks", () => {
  const grid = monthGrid("2026-11"); // 2026-11-01 은 일요일
  assert.equal(grid.length, 42);
  assert.equal(grid[0], "2026-11-01");
  const march = monthGrid("2026-03"); // 2026-03-01 은 일요일, 2027-01-01 은 금요일
  assert.equal(march[0], "2026-03-01");
  assert.equal(monthGrid("2027-01")[0], "2026-12-27");
});

test("shiftMonth crosses years", () => {
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
});

test("itemsOn keeps items spanning the day, all-day first then by time", () => {
  const items = [
    item({ id: "late", startTime: "15:00:00", endTime: "16:00:00" }),
    item({ id: "early", startTime: "09:00:00", endTime: "10:00:00" }),
    item({
      id: "span",
      kind: "SPRINT",
      startDate: "2026-11-01",
      endDate: "2026-11-14",
    }),
    item({ id: "other", startDate: "2026-11-11", endDate: "2026-11-11" }),
  ];
  assert.deepEqual(
    itemsOn(items, "2026-11-10").map((it) => it.id),
    ["span", "early", "late"],
  );
});
