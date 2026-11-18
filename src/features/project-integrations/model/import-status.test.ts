import assert from "node:assert/strict";
import { test } from "node:test";
import {
  importSummary,
  isImportActive,
  type RepositoryImport,
} from "./import-status";

const run = (patch: Partial<RepositoryImport>): RepositoryImport => ({
  id: "1",
  projectRepositoryId: "10",
  status: "RUNNING",
  imported: 0,
  skipped: 0,
  failed: 0,
  total: null,
  errorCode: null,
  startedAt: null,
  finishedAt: null,
  createdAt: "2026-11-18T00:00:00Z",
  ...patch,
});

test("import summary shows progress as numbers and only offers retry on failures", () => {
  assert.equal(
    importSummary(run({ imported: 3, skipped: 1, total: 10 })).text,
    "Issue 가져오는 중 4/10",
  );
  assert.equal(importSummary(run({})).text, "Issue 목록 확인 중");
  assert.equal(
    importSummary(run({ status: "SUCCEEDED", total: 0 })).text,
    "가져올 열린 Issue가 없어요",
  );
  assert.equal(
    importSummary(run({ status: "SUCCEEDED", imported: 5, skipped: 2 })).text,
    "가져옴 5 · 이미 있음 2",
  );
  const partial = importSummary(run({ status: "PARTIAL", failed: 2 }));
  assert.equal(partial.retryable, true);
  assert.match(partial.text, /실패 2/);
  const failed = importSummary(
    run({ status: "FAILED", errorCode: "GITHUB_UNAVAILABLE" }),
  );
  assert.equal(failed.retryable, true);
  assert.match(failed.text, /GitHub에 연결할 수 없었어요/);
  const restricted = importSummary(
    run({ status: "RESTRICTED", errorCode: "GITHUB_REPOSITORY_NOT_INSTALLED" }),
  );
  assert.equal(restricted.retryable, false);
  assert.match(restricted.text, /접근할 수 없어요/);
  assert.match(
    importSummary(run({ status: "FAILED", errorCode: "UNKNOWN_X" })).text,
    /다시 시도/,
  );
});

test("polling stays on only while an import is pending or running", () => {
  assert.equal(isImportActive(run({ status: "PENDING" })), true);
  assert.equal(isImportActive(run({ status: "RUNNING" })), true);
  for (const status of [
    "SUCCEEDED",
    "PARTIAL",
    "FAILED",
    "RESTRICTED",
  ] as const)
    assert.equal(isImportActive(run({ status })), false);
  assert.equal(isImportActive(null), false);
});
