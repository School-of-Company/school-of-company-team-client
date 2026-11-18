import assert from "node:assert/strict";
import { test } from "node:test";
import { withoutTask } from "./without-task";

test("보드 열·확인 필요 항목·리뷰 요청의 연결 업무에서 그 업무만 뺀다", () => {
  const board = {
    groups: [
      {
        key: null,
        columns: { PLANNED: [{ id: "t1" }, { id: "t2" }], DONE: [] },
      },
    ],
    counts: { PLANNED: 2 },
  };
  const next = withoutTask(board, "t1");
  assert.deepEqual(next.groups[0].columns.PLANNED, [{ id: "t2" }]);
  assert.equal(next.groups[0].columns.DONE, board.groups[0].columns.DONE);
  const attention = { items: [{ rule: "OVERDUE", task: { id: "t1" } }] };
  assert.deepEqual(withoutTask(attention, "t1").items, []);
  const reviews = [{ number: 1, tasks: [{ id: "t1" }, { id: "t3" }] }];
  assert.deepEqual(withoutTask(reviews, "t1"), [
    { number: 1, tasks: [{ id: "t3" }] },
  ]);
});

test("그 업무가 없으면 같은 객체를 돌려준다", () => {
  const data = { items: [{ id: "a" }], project: { id: "p" } };
  assert.equal(withoutTask(data, "t1"), data);
  assert.equal(withoutTask(undefined, "t1"), undefined);
});
