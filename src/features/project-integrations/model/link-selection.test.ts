import assert from "node:assert/strict";
import { test } from "node:test";
import type { LinkOutcome } from "./batch-link";
import {
  chosenIds,
  defaultRepositoryId,
  isSelectable,
  settledResults,
  statusLabel,
} from "./link-selection";

const results = (entries: [number, LinkOutcome][]) => new Map(entries);

test("연결됐거나 연결 중이거나 이번에 연결된 저장소는 고를 수 없다", () => {
  const linked = new Set([1]);
  const run = results([
    [2, { status: "linking" }],
    [3, { status: "linked" }],
    [4, { status: "failed", reason: "x" }],
    [5, { status: "canceled" }],
  ]);
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6].map((id) => isSelectable(id, linked, run)),
    [false, false, false, true, true, true],
  );
});

test("보낼 저장소는 선택한 것 중 다시 보내도 되는 것만 화면 순서대로", () => {
  assert.deepEqual(
    chosenIds(
      [6, 5, 4, 3, 2, 1],
      new Set([1, 2, 4, 6]),
      new Set([1]),
      results([[2, { status: "linking" }]]),
    ),
    [6, 4],
  );
});

test("기본 저장소는 아직 없을 때 이번 묶음에 있는 하나만 지정한다", () => {
  assert.equal(defaultRepositoryId([1, 2], 2, false), 2);
  assert.equal(defaultRepositoryId([1, 2], 2, true), null);
  assert.equal(defaultRepositoryId([1, 2], 3, false), null);
  assert.equal(defaultRepositoryId([1, 2], null, false), null);
});

test("연결됨은 연결 목록을 따르고 실패와 취소 사유를 보여 준다", () => {
  const run = results([
    [2, { status: "linking" }],
    [3, { status: "failed", reason: "권한 없음" }],
    [4, { status: "canceled" }],
    [5, { status: "linked" }],
  ]);
  const linked = new Set([1]);
  assert.equal(statusLabel(1, linked, run), "연결됨");
  assert.equal(statusLabel(2, linked, run), "연결 중");
  assert.equal(statusLabel(3, linked, run), "실패: 권한 없음");
  assert.equal(statusLabel(4, linked, run), "취소됨");
  assert.equal(statusLabel(5, linked, run), "연결됨");
  assert.equal(statusLabel(6, linked, run), "");
  // 실패했지만 다른 곳에서 이미 연결된 저장소는 목록을 따른다.
  assert.equal(statusLabel(3, new Set([3]), run), "연결됨");
});

test("목록을 다시 받은 뒤에는 연결됨 결과를 지워 다른 곳의 연결 해제가 그대로 보인다", () => {
  const settled = settledResults(
    results([
      [1, { status: "linked" }],
      [2, { status: "failed", reason: "x" }],
      [3, { status: "canceled" }],
      [4, { status: "failed", reason: "y" }],
    ]),
    new Set([1, 4]),
  );
  assert.deepEqual([...settled.keys()], [2, 3]);
  assert.equal(statusLabel(1, new Set(), settled), "");
});
