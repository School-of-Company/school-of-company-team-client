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
  // 2주가 넘게 남으면 남은 날 대신 날짜로 읽는다.
  assert.equal(dueLabel(today, "2027-07-28"), "7월 28일");
  assert.equal(dueLabel(today, "2026-11-20"), "내일 마감");
  assert.equal(dueLabel(today, "2026-11-22"), "3일 남음");
});

test("blocked label counts whole days and never shows zero", () => {
  const now = Date.parse("2026-11-19T10:00:00+09:00");
  assert.equal(blockedLabel("2026-11-17T10:00:00+09:00", now), "2일째 막힘");
  assert.equal(blockedLabel("2026-11-16T09:00:00+09:00", now), "3일째 막힘");
  assert.equal(blockedLabel("2026-11-19T09:00:00+09:00", now), "1일째 막힘");
});

test("rule-marked items sit after merged-not-done and stay distinct per automation rule", () => {
  const marked = (ruleId: string): AttentionItem => ({
    ...item("RULE_MARKED", "x"),
    sprint: null,
    task: { id: "t1" } as AttentionItem["task"],
    automationRule: { id: ruleId, name: `규칙 ${ruleId}` },
  });
  const attention = {
    items: [
      item("SPRINT_ENDING", "s1"),
      marked("r1"),
      marked("r2"),
      item("MERGED_NOT_DONE", "m"),
    ],
    counts: {},
  } as unknown as Attention;
  assert.deepEqual(
    groupByRule(attention).map((group) => [
      group.rule,
      group.items.map(itemKey),
    ]),
    [
      ["MERGED_NOT_DONE", ["MERGED_NOT_DONE:m::"]],
      ["RULE_MARKED", ["RULE_MARKED:t1:::r1", "RULE_MARKED:t1:::r2"]],
      ["SPRINT_ENDING", ["SPRINT_ENDING:s1::"]],
    ],
  );
});
