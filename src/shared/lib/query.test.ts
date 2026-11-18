import assert from "node:assert/strict";
import { test } from "node:test";
import { hashKey } from "@tanstack/react-query";
import { keepPreviousKey } from "./query";

test("키가 바뀔 때만 이전 데이터를 빌려 오고, 같은 키가 지워진 뒤에는 빌려 오지 않는다", () => {
  const keep = keepPreviousKey(["tasks", "board", "status=DONE"]);
  const other = { queryHash: hashKey(["tasks", "board", "status=REVIEW"]) };
  const same = { queryHash: hashKey(["tasks", "board", "status=DONE"]) };
  assert.deepEqual(keep(["카드"], other), ["카드"]);
  assert.equal(keep(["카드"], same), undefined);
  assert.equal(keep(["카드"], undefined), undefined);
});
