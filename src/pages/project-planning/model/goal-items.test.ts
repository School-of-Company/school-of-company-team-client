import assert from "node:assert/strict";
import { test } from "node:test";
import { goalItemsError, goalItemsRequest, percent } from "./goal-items";

test("goal items drop blank rows and keep ids of existing items", () => {
  assert.deepEqual(
    goalItemsRequest([
      { key: "G1", id: "G1", text: " 로그인 개편 배포 " },
      { key: "n1", text: "   " },
      { key: "n2", text: "새 항목" },
    ]),
    [{ id: "G1", text: "로그인 개편 배포" }, { text: "새 항목" }],
  );
});

test("goal items stop at 10 and 200 characters", () => {
  const items = Array.from({ length: 11 }, () => ({ text: "a" }));
  assert.ok(goalItemsError(items));
  assert.equal(goalItemsError(items.slice(0, 10)), undefined);
  assert.ok(goalItemsError([{ text: "a".repeat(201) }]));
});

test("percent rounds a 0-1 rate and keeps null", () => {
  assert.equal(percent(0.666), 67);
  assert.equal(percent(null), null);
});
