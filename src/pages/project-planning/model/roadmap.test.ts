import assert from "node:assert/strict";
import { test } from "node:test";
import type { Milestone } from "@/entities/milestone";
import { milestoneDateLabel, roadmapLayout } from "./roadmap";

const item = (patch: Partial<Milestone>) =>
  ({
    id: "M",
    name: "M",
    timelineStart: null,
    dueDate: null,
    sprints: [],
    ...patch,
  }) as Milestone;

test("roadmap spans whole months covering every date and today", () => {
  const layout = roadmapLayout(
    [
      item({
        id: "A",
        timelineStart: "2026-11-01",
        dueDate: "2026-11-30",
        sprints: [
          {
            id: "S",
            name: "Sprint 1",
            startDate: "2026-11-01",
            endDate: "2026-11-14",
            status: "CLOSED",
          },
        ],
      }),
      item({ id: "B", dueDate: "2026-12-31" }),
      item({ id: "C" }),
    ],
    "2026-11-16",
  );
  // 11월 + 12월 = 61일.
  assert.deepEqual(
    layout.months.map((month) => [month.label, month.left]),
    [
      ["2026년 11월", 0],
      ["12월", (30 / 61) * 100],
    ],
  );
  assert.equal(layout.today, (15 / 61) * 100);
  assert.deepEqual(layout.rows[0].bar, { left: 0, width: (30 / 61) * 100 });
  assert.deepEqual(layout.rows[0].sprints[0].span, {
    left: 0,
    width: (14 / 61) * 100,
  });
  // 마감일만 있으면 그날 하루짜리 막대.
  assert.deepEqual(layout.rows[1].bar, {
    left: (60 / 61) * 100,
    width: (1 / 61) * 100,
  });
  assert.deepEqual(
    layout.undated.map((milestone) => milestone.id),
    ["C"],
  );
});

test("roadmap with no dated milestone has no timeline", () => {
  const layout = roadmapLayout([item({ id: "C" })], "2026-11-16");
  assert.equal(layout.today, null);
  assert.equal(layout.rows.length, 0);
  assert.equal(layout.undated.length, 1);
});

test("year label appears on January", () => {
  const layout = roadmapLayout(
    [item({ timelineStart: "2026-12-01", dueDate: "2027-01-10" })],
    "2026-12-05",
  );
  assert.deepEqual(
    layout.months.map((month) => month.label),
    ["2026년 12월", "2027년 1월"],
  );
});

test("date label reads the range, due-only, start-only and none", () => {
  assert.equal(milestoneDateLabel(item({})), "날짜 없음");
  assert.match(
    milestoneDateLabel(item({ dueDate: "2026-12-20" })),
    /12월 20일 마감/,
  );
  assert.match(
    milestoneDateLabel(item({ timelineStart: "2026-11-01" })),
    /11월 1일 시작/,
  );
});
