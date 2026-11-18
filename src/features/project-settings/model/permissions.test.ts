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
  createdAt: "2026-11-18T00:00:00Z",
  members: [],
  parts: [],
};

test("only the head admin can assign PM; PM and own-part leader have bounded settings access", () => {
  const project = base;
  const head = getSettingsPermissions({ id: "head", role: "LEAD" }, project);
  const pm = getSettingsPermissions({ id: "pm", role: "MEMBER" }, project);
  const leader = getSettingsPermissions(
    { id: "leader", role: "MEMBER" },
    project,
  );
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
    [
      leader.manage,
      leader.assignPartMembers("leader"),
      leader.assignPartMembers("other"),
    ],
    [false, true, false],
  );
  assert.deepEqual(
    [member.manage, member.archive, member.assignPartMembers(null)],
    [false, false, false],
  );
});

test("archived projects disable every settings write except manager restoration", () => {
  const project = { ...base, archived: true };
  const head = getSettingsPermissions({ id: "head", role: "LEAD" }, project);
  const pm = getSettingsPermissions({ id: "pm", role: "MEMBER" }, project);
  const leader = getSettingsPermissions(
    { id: "leader", role: "MEMBER" },
    project,
  );

  assert.deepEqual(
    [head.assignPm, head.manage, head.assignPartMembers("head"), head.archive],
    [false, false, false, true],
  );
  assert.deepEqual(
    [pm.manage, pm.assignPartMembers("pm"), pm.archive],
    [false, false, true],
  );
  assert.deepEqual(
    [leader.assignPartMembers("leader"), leader.archive],
    [false, false],
  );
});
