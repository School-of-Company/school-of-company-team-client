import assert from "node:assert/strict";
import { test } from "node:test";
import { validateProjectForm } from "./validation";

test("project creation accepts immutable uppercase keys of 2–10 characters and names of 1–100 characters", () => {
  for (const key of ["AB", "A123456789"]) {
    assert.equal(validateProjectForm({ key, name: "a".repeat(100) }), null);
  }
  for (const key of ["A", "abc", "1AB", "ABCDEFGHIJK", "A B"]) {
    assert.notEqual(validateProjectForm({ key, name: "Project" }), null);
  }
  for (const name of ["", "   ", "a".repeat(101)]) {
    assert.notEqual(validateProjectForm({ name }), null);
  }
  assert.equal(validateProjectForm({ name: "Project" }), null);
});
