import assert from "node:assert/strict";
import { test } from "node:test";
import { burndownPoints, burndownRows } from "./burndown";

const data = {
  basis: "WEIGHT" as const,
  days: [
    {
      date: "2026-11-30",
      remainingWeight: 8,
      remainingCount: 4,
      totalWeight: 8,
      totalCount: 4,
    },
    {
      date: "2026-12-01",
      remainingWeight: 6,
      remainingCount: 3,
      totalWeight: 8,
      totalCount: 4,
    },
  ],
  ideal: [
    { date: "2026-11-30", remaining: 8 },
    { date: "2026-12-01", remaining: 4 },
    { date: "2026-12-02", remaining: 0 },
  ],
};
const range = { startDate: "2026-11-30", endDate: "2026-12-02" };

test("burndown places points on the sprint range in the basis unit", () => {
  const points = burndownPoints(data, range);
  assert.equal(points.max, 8);
  assert.deepEqual(
    points.remaining.map(({ x, y }) => [x, y]),
    [
      [0, 1],
      [0.5, 0.75],
    ],
  );
  assert.deepEqual(points.ideal.at(-1), {
    date: "2026-12-02",
    value: 0,
    x: 1,
    y: 0,
  });
  assert.equal(
    burndownPoints({ ...data, basis: "COUNT" }, range).remaining[1].value,
    3,
  );
});

test("burndown table merges ideal and snapshot dates", () => {
  assert.deepEqual(burndownRows(data), [
    { date: "2026-11-30", remaining: 8, ideal: 8 },
    { date: "2026-12-01", remaining: 6, ideal: 4 },
    { date: "2026-12-02", remaining: null, ideal: 0 },
  ]);
});
