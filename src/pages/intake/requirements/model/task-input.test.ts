import assert from "node:assert/strict";
import { test } from "node:test";
import { taskIdFromInput } from "./task-input";

const id = "01JDZ8Q6M3V4X5Y6Z7A8B9C0D1";

test("업무 주소·보드 패널 주소·ID 모두에서 업무 ID 를 읽는다", () => {
  assert.equal(taskIdFromInput(id), id);
  assert.equal(taskIdFromInput(` https://hub.example/tasks/${id} `), id);
  assert.equal(taskIdFromInput(`/projects/P1/?task=${id}`), id);
  assert.equal(taskIdFromInput("HUB-142"), null);
  assert.equal(taskIdFromInput(""), null);
});
