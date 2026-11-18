import assert from "node:assert/strict";
import { test } from "node:test";
import { validatePartName } from "./part-validation";

test("part names reject blanks and overflow without truncating user input", () => {
  assert.equal(validatePartName("개발"), null);
  assert.equal(validatePartName("a".repeat(50)), null);
  for (const name of ["", "   ", "a".repeat(51)]) {
    assert.notEqual(validatePartName(name), null);
  }
});
