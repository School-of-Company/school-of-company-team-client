import { test } from "node:test";
import assert from "node:assert/strict";
import { projectAccess } from "./types.ts";

const project = {
  archived: false,
  pmUserId: "pm",
  members: [{ userId: "member" }],
};
test("readable nonparticipants have no edit controls", () => {
  assert.deepEqual(projectAccess(project, { id: "reader", role: "MEMBER" }), {
    manages: false,
    participates: false,
    editable: false,
  });
});
test("project members can edit without managing settings", () => {
  assert.deepEqual(projectAccess(project, { id: "member", role: "MEMBER" }), {
    manages: false,
    participates: true,
    editable: true,
  });
});
test("archive blocks even the project manager from editing", () => {
  assert.deepEqual(
    projectAccess({ ...project, archived: true }, { id: "pm", role: "MEMBER" }),
    { manages: true, participates: false, editable: false },
  );
});
