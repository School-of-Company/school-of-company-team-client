import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createMilestoneBody,
  milestoneInput,
  milestonePercent,
  updateMilestoneBody,
  validateMilestone,
  type Milestone,
  type MilestoneInput,
} from "./types";

const milestone = {
  id: "M1",
  projectId: "P1",
  name: "베타 출시",
  description: null,
  goal: "## 목표",
  specDocument: null,
  startDate: "2026-11-01",
  dueDate: "2026-12-20",
  timelineStart: "2026-11-01",
  status: "IN_PROGRESS",
  autoStatus: "IN_PROGRESS",
  statusSource: "AUTO",
  statusOverride: null,
  risk: { level: "NONE", reason: null },
  progress: { total: 4, done: 1, totalWeight: 0, doneWeight: 0 },
  sprints: [],
  releaseLink: null,
  release: null,
  createdAt: "",
  updatedAt: "",
} satisfies Milestone;

test("update sends only changed fields, so hidden spec docs and private release links survive", () => {
  const previous = milestoneInput(milestone);
  assert.deepEqual(updateMilestoneBody(previous, previous), {});
  assert.deepEqual(
    updateMilestoneBody({ ...previous, name: "정식 출시" }, previous),
    { name: "정식 출시" },
  );
});

test("update uses the contract's clear flags for emptied fields", () => {
  const previous = milestoneInput(milestone);
  const next: MilestoneInput = {
    ...previous,
    startDate: "",
    dueDate: "",
    goal: "",
    statusOverride: "DONE",
  };
  assert.deepEqual(updateMilestoneBody(next, previous), {
    goal: "",
    clearStartDate: true,
    clearDueDate: true,
    statusOverride: "DONE",
  });
  assert.deepEqual(
    updateMilestoneBody(previous, { ...previous, statusOverride: "DONE" }),
    { clearStatusOverride: true },
  );
});

test("release link is set as a pair and cleared with clearReleaseLink", () => {
  const previous = milestoneInput(milestone);
  const linked = {
    ...previous,
    releaseRepositoryId: "555",
    releaseTag: " v1.0.0 ",
  };
  assert.deepEqual(updateMilestoneBody(linked, previous), {
    releaseLink: { repositoryId: 555, tag: "v1.0.0" },
  });
  assert.deepEqual(updateMilestoneBody(previous, linked), {
    clearReleaseLink: true,
  });
  assert.deepEqual(createMilestoneBody(linked).releaseLink, {
    repositoryId: 555,
    tag: "v1.0.0",
  });
  assert.equal(createMilestoneBody(previous).releaseLink, null);
});

test("validation mirrors the server rules", () => {
  const base = milestoneInput(milestone);
  assert.deepEqual(validateMilestone(base), {});
  assert.ok(validateMilestone({ ...base, goal: "x".repeat(2001) }).goal);
  assert.ok(validateMilestone({ ...base, startDate: "2026-12-21" }).dueDate);
  assert.ok(
    validateMilestone({ ...base, releaseRepositoryId: "1", releaseTag: "v 1" })
      .releaseTag,
  );
  assert.ok(
    validateMilestone({ ...base, releaseRepositoryId: "1", releaseTag: "" })
      .releaseTag,
  );
});

test("percent uses weight when anything is sized, otherwise counts", () => {
  assert.equal(milestonePercent(milestone.progress), 25);
  assert.equal(
    milestonePercent({ total: 4, done: 1, totalWeight: 10, doneWeight: 8 }),
    80,
  );
  assert.equal(
    milestonePercent({
      total: 0,
      done: 0,
      totalWeight: 0,
      doneWeight: 0,
    }),
    0,
  );
  // 크기 없는 업무는 무게 0: 무게로 보면 S(1) 하나 끝난 2/3 업무가 100%다.
  assert.equal(
    milestonePercent({ total: 3, done: 2, totalWeight: 1, doneWeight: 1 }),
    100,
  );
});
