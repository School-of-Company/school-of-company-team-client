import assert from "node:assert/strict";
import { test } from "node:test";
import { getSettingsPermissions } from "./permissions";
import type { ProjectDetail } from "@/entities/project";

const base: ProjectDetail = {
  id: "project",
  key: "PR",
  name: "Project",
  description: null,
  visibility: "MEMBERS",
  archived: false,
  pmUserId: "pm",
  stage: "REVIEW",
  kind: "INTERNAL",
  workflow: "SPRINT",
  createdAt: "2026-11-18T00:00:00Z",
  members: [],
  parts: [],
};

test("only the head admin can assign PM; only PM and head admin manage settings and parts", () => {
  const project = base;
  const head = getSettingsPermissions({ id: "head", role: "LEAD" }, project);
  const pm = getSettingsPermissions({ id: "pm", role: "MEMBER" }, project);
  const member = getSettingsPermissions(
    { id: "member", role: "MEMBER" },
    project,
  );

  assert.deepEqual(
    [head.assignPm, head.manage, head.archive],
    [true, true, true],
  );
  assert.deepEqual([pm.assignPm, pm.manage, pm.archive], [false, true, true]);
  assert.deepEqual(
    [member.assignPm, member.manage, member.archive],
    [false, false, false],
  );
});

test("archived projects disable every settings write except manager restoration", () => {
  const project = { ...base, archived: true };
  const head = getSettingsPermissions({ id: "head", role: "LEAD" }, project);
  const pm = getSettingsPermissions({ id: "pm", role: "MEMBER" }, project);

  assert.deepEqual(
    [head.assignPm, head.manage, head.archive],
    [false, false, true],
  );
  assert.deepEqual([pm.manage, pm.archive], [false, true]);
});
