import assert from "node:assert/strict";
import { test } from "node:test";
import { readGuideTab } from "./tabs";

test("guide tab maps the URL value to its section and falls back to culture", () => {
  assert.equal(readGuideTab("operations").section, "OPERATIONS");
  assert.equal(readGuideTab("project").label, "프로젝트 진행");
  assert.equal(readGuideTab(null).section, "CULTURE");
  assert.equal(readGuideTab("OPERATIONS").section, "CULTURE");
});
