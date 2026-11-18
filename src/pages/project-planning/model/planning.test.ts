import assert from "node:assert/strict";
import { test } from "node:test";
import type { TaskCard } from "@/entities/task";
import { daysLeft, remainingLabel } from "./dates";
import { applyScopeOverlay, sourceParams } from "./sprint-tasks";
import { selectedSprintTab, sprintTabs } from "./tabs";
import { validateRetro, validateSprint } from "./validation";

const card = (id: string, status: TaskCard["status"] = "BACKLOG") =>
  ({
    id,
    key: id,
    status,
    title: id,
    assignees: [],
    position: 0,
  }) as unknown as TaskCard;

test("optimistic overlay moves tasks between the two panes and rolls back when cleared", () => {
  const candidates = [card("A"), card("B")];
  const scoped = [card("C"), card("D", "DONE")];
  const moved = applyScopeOverlay(candidates, scoped, {
    A: "add",
    C: "remove",
    D: "remove",
  });
  assert.deepEqual(
    moved.candidates.map((task) => task.id),
    ["B", "C"],
  );
  assert.deepEqual(
    moved.scoped.map((task) => task.id),
    ["A"],
  );
  const cleared = applyScopeOverlay(candidates, scoped, {});
  assert.deepEqual(
    cleared.candidates.map((task) => task.id),
    ["A", "B"],
  );
  assert.deepEqual(
    cleared.scoped.map((task) => task.id),
    ["C", "D"],
  );
});

test("planning sources always exclude tasks already in an open sprint", () => {
  assert.equal(
    sourceParams("HUB", "backlog"),
    "project=HUB&sprint=none&status=BACKLOG",
  );
  const bucket = new URLSearchParams(sourceParams("HUB", "bucket:B1"));
  assert.equal(bucket.get("bucket"), "B1");
  assert.equal(bucket.get("status"), "BACKLOG,PLANNED,IN_PROGRESS,REVIEW");
  assert.equal(
    new URLSearchParams(sourceParams("HUB", "no-bucket")).get("bucket"),
    "none",
  );
  assert.equal(
    new URLSearchParams(sourceParams("HUB", "open")).get("bucket"),
    null,
  );
});

test("sprint tab follows status unless the URL names a usable tab", () => {
  assert.equal(selectedSprintTab("PLANNED", null), "plan");
  assert.equal(selectedSprintTab("ACTIVE", undefined), "progress");
  assert.equal(selectedSprintTab("CLOSED", "plan"), "review");
  assert.equal(selectedSprintTab("ACTIVE", "retro"), "retro");
  assert.deepEqual(sprintTabs("CLOSED"), ["progress", "review", "retro"]);
});

test("remaining days count calendar days", () => {
  assert.equal(daysLeft("2026-11-27", "2026-11-19"), 8);
  assert.equal(remainingLabel("2026-11-19", "2026-11-19"), "오늘 종료");
  assert.equal(remainingLabel("2026-11-17", "2026-11-19"), "종료일 2일 지남");
});

test("sprint and retro validation match the server limits", () => {
  assert.deepEqual(
    Object.keys(
      validateSprint({
        name: "",
        goal: "",
        startDate: "2026-11-20",
        endDate: "2026-11-19",
      }),
    ),
    ["name", "endDate"],
  );
  assert.deepEqual(
    validateSprint({
      name: "11월 4주차",
      goal: "",
      startDate: "2026-11-20",
      endDate: "2026-11-20",
    }),
    {},
  );
  assert.equal(validateRetro("   "), "내용을 입력하세요.");
  assert.equal(validateRetro("x".repeat(1001)), "1000자 이하로 입력하세요.");
  assert.equal(validateRetro("좋았다"), null);
});
