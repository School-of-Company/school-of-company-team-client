import assert from "node:assert/strict";
import { test } from "node:test";
import { hashKey } from "@tanstack/react-query";
import {
  HIDDEN_REPOSITORY,
  keepPreviousKey,
  repositoryName,
  settledData,
} from "./query";

test("키가 바뀔 때만 이전 데이터를 빌려 오고, 같은 키가 지워진 뒤에는 빌려 오지 않는다", () => {
  const keep = keepPreviousKey(["tasks", "board", "status=DONE"]);
  const other = { queryHash: hashKey(["tasks", "board", "status=REVIEW"]) };
  const same = { queryHash: hashKey(["tasks", "board", "status=DONE"]) };
  assert.deepEqual(keep(["카드"], other), ["카드"]);
  assert.equal(keep(["카드"], same), undefined);
  assert.equal(keep(["카드"], undefined), undefined);
});

test("이름이 숨겨진 저장소는 이름 대신 비공개 저장소로 쓴다", () => {
  assert.equal(repositoryName({ fullName: "acme/web" }), "acme/web");
  assert.equal(
    repositoryName({ fullName: "acme/web", accessible: true }),
    "acme/web",
  );
  assert.equal(
    repositoryName({ fullName: "acme/secret", accessible: false }),
    HIDDEN_REPOSITORY,
  );
  assert.equal(repositoryName({ fullName: null }), HIDDEN_REPOSITORY);
  assert.equal(repositoryName({ fullName: "" }), HIDDEN_REPOSITORY);
});

test("placeholder 데이터로는 개수나 빈 상태를 그리지 않는다", () => {
  assert.deepEqual(settledData({ data: [1], isPlaceholderData: false }), [1]);
  assert.equal(settledData({ data: [1], isPlaceholderData: true }), undefined);
  assert.equal(
    settledData({ data: undefined, isPlaceholderData: false }),
    undefined,
  );
});
