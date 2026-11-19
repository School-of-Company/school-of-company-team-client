import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTaskRef } from "./task-ref";

const id = "01JD0000000000000000000T01";

test("업무 상세 주소와 보드 패널 주소에서 ID를 꺼낸다", () => {
  assert.equal(parseTaskRef(`http://localhost:3101/tasks/${id}`), id);
  assert.equal(parseTaskRef(`/tasks/${id}?x=1`), id);
  assert.equal(parseTaskRef(`https://a.b/projects/P1?task=${id}&q=2`), id);
});

test("ID 그대로도 받고 소문자는 대문자로 맞춘다", () => {
  assert.equal(parseTaskRef(` ${id.toLowerCase()} `), id);
});

test("그 밖은 null", () => {
  assert.equal(parseTaskRef(""), null);
  assert.equal(parseTaskRef("HUB-142"), null);
  assert.equal(parseTaskRef(`/tasks/${id}X`), null);
});
