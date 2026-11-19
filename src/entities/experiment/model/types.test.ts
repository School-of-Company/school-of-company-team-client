import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parseLinkTarget } from "./types";

test("link targets are read from in-app task and document addresses", () => {
  assert.deepEqual(parseLinkTarget("https://team.example/tasks/01ABC"), {
    kind: "TASK",
    targetId: "01ABC",
  });
  assert.deepEqual(parseLinkTarget("/docs/01XYZ/"), {
    kind: "DOCUMENT",
    targetId: "01XYZ",
  });
  assert.equal(parseLinkTarget("GWANGSAN-3"), null);
  assert.equal(parseLinkTarget("https://github.com/org/repo/issues/1"), null);
  assert.equal(parseLinkTarget("  "), null);
});
