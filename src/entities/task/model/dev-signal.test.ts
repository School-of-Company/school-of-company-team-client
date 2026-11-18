import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestsDone } from "./dev-signal";

test("merge 제안은 완료 전 업무에만 보인다(자동 이동 없음)", () => {
  assert.equal(suggestsDone(true, "REVIEW"), true);
  assert.equal(suggestsDone(true, "DONE"), false);
  assert.equal(suggestsDone(false, "REVIEW"), false);
});

