import assert from "node:assert/strict";
import { test } from "node:test";
import type { Attention, AttentionItem } from "../api/home";
import {
  blockedLabel,
  dueLabel,
  groupByRule,
  itemKey,
  seoulToday,
} from "./attention";

const item = (rule: AttentionItem["rule"], id: string): AttentionItem => ({
  rule,
  task: null,
  sprint: {
    id,
    projectId: "p",
    projectKey: "HUB",
    name: id,
    endDate: "2026-11-20",
    openTaskCount: 1,
  },
  pullRequest: null,
  since: null,
  dueDate: null,
});

test("groups keep rule order and drop empty rules", () => {
  const attention = {
    items: [
      item("SPRINT_ENDING", "s1"),
      item("OVERDUE", "a"),
      item("OVERDUE", "b"),
    ],
    counts: {},
  } as unknown as Attention;
  const groups = groupByRule(attention);
  assert.deepEqual(
    groups.map((group) => [group.rule, group.items.map(itemKey)]),
    [
      ["OVERDUE", ["OVERDUE:a::", "OVERDUE:b::"]],
      ["SPRINT_ENDING", ["SPRINT_ENDING:s1::"]],
    ],
  );
});

test("today is the Seoul date even when UTC is still yesterday", () => {
  assert.equal(seoulToday("2026-11-18T15:30:00Z"), "2026-11-19");
  assert.equal(seoulToday("2026-11-19T10:00:00+09:00"), "2026-11-19");
});

test("due labels around today", () => {
  const today = "2026-11-19";
  assert.equal(dueLabel(today, "2026-11-17"), "2일 지남");
  assert.equal(dueLabel(today, "2026-11-19"), "오늘 마감");
  assert.equal(dueLabel(today, "2026-11-20"), "내일 마감");
  assert.equal(dueLabel(today, "2026-11-22"), "3일 남음");
});

test("blocked label counts whole days and never shows zero", () => {
  const now = Date.parse("2026-11-19T10:00:00+09:00");
  assert.equal(blockedLabel("2026-11-17T10:00:00+09:00", now), "2일째 막힘");
  assert.equal(blockedLabel("2026-11-16T09:00:00+09:00", now), "3일째 막힘");
  assert.equal(blockedLabel("2026-11-19T09:00:00+09:00", now), "1일째 막힘");
});
