import assert from "node:assert/strict";
import { test } from "node:test";
import { summarize } from "./summary";

test("filter chips name up to two picks and collapse the rest", () => {
  assert.equal(summarize(["박하민"], "명"), "박하민");
  assert.equal(summarize(["박하민", "송재욱"], "명"), "박하민, 송재욱");
  assert.equal(summarize(["박하민", "송재욱", "김"], "명"), "박하민 외 2명");
  const many = Array.from({ length: 24 }, (_, i) => `아주 긴 이름의 팀원 ${i}`);
  assert.equal(summarize(many, "명"), "아주 긴 이름의 팀원 0 외 23명");
  assert.equal(summarize(["긴급", "높음", "보통"], "개"), "긴급 외 2개");
});
