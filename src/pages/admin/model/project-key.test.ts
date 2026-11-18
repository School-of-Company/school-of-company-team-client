import assert from "node:assert/strict";
import { test } from "node:test";
import { suggestProjectKey } from "./project-key";

test("suggested keys satisfy the immutable server key constraint for Korean, punctuation, numeric and long names", () => {
  for (const name of [
    "회사 업무",
    "A",
    "123",
    "123 api!",
    "Engineering Hub",
    " a ",
    "",
    "한글 ABC 프로젝트",
    "2026-year-long-project-name",
  ]) {
    assert.match(suggestProjectKey(name), /^[A-Z][A-Z0-9]{1,9}$/);
  }
});
