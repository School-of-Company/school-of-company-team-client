import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bucketState,
  healthErrorLabel,
  historySummary,
  sentrySummary,
  type HealthBucket,
  type HealthHistory,
} from "./ops";

const bucket = (
  okCount: number,
  failCount: number,
  p50LatencyMs: number | null,
): HealthBucket => ({
  start: "2026-11-25T10:00:00+09:00",
  okCount,
  failCount,
  p50LatencyMs,
});

test("bucket state separates empty, ok, mixed and failed buckets", () => {
  assert.equal(bucketState(bucket(0, 0, null)), "EMPTY");
  assert.equal(bucketState(bucket(3, 0, 140)), "OK");
  assert.equal(bucketState(bucket(2, 1, 140)), "MIXED");
  assert.equal(bucketState(bucket(0, 3, null)), "FAIL");
});

test("history summary counts checks and finds the tallest p50", () => {
  const history: HealthHistory = {
    range: "24h",
    from: "2026-11-24T10:15:00+09:00",
    to: "2026-11-25T10:15:00+09:00",
    bucketMinutes: 15,
    buckets: [bucket(3, 0, 140), bucket(0, 0, null), bucket(1, 2, 900)],
  };
  assert.deepEqual(historySummary(history), {
    ok: 4,
    failed: 2,
    maxLatencyMs: 900,
  });
});

test("unknown error codes are shown as they are", () => {
  assert.equal(healthErrorLabel("TIMEOUT"), "시간 초과");
  assert.equal(healthErrorLabel("NEW_CODE"), "NEW_CODE");
});

test("sentry says why there are no numbers", () => {
  const base = {
    unresolvedCount: null,
    events24h: null,
    fetchedAt: null,
    errorCode: null,
  };
  assert.equal(
    sentrySummary({ ...base, status: "NOT_CONFIGURED" }),
    "연결 안 됨",
  );
  assert.equal(sentrySummary({ ...base, status: "PENDING" }), "가져오는 중");
  assert.equal(
    sentrySummary({
      ...base,
      status: "OK",
      unresolvedCount: 4,
      events24h: 120,
    }),
    "미해결 4, 24시간 120",
  );
  assert.equal(
    sentrySummary({
      ...base,
      status: "ERROR",
      unresolvedCount: 4,
      events24h: 1,
    }),
    "미해결 4, 24시간 1 (갱신 실패)",
  );
});
