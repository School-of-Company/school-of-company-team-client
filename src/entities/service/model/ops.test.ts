import assert from "node:assert/strict";
import { test } from "node:test";
import { healthHistory, sentrySummary, type HealthCheckRecord } from "./ops";

const now = Date.parse("2026-11-25T10:00:00+09:00");
const check = (
  checkedAt: string,
  ok: boolean,
  latencyMs: number | null,
): HealthCheckRecord => ({
  checkedAt,
  ok,
  latencyMs,
  statusCode: ok ? 200 : null,
  errorCode: ok ? null : "TIMEOUT",
});

test("history keeps the last 24 hours, oldest first, and averages successful latency", () => {
  const history = healthHistory(
    [
      check("2026-11-25T09:55:00+09:00", true, 300),
      check("2026-11-25T09:50:00+09:00", false, null),
      check("2026-11-25T09:45:00+09:00", true, 100),
      check("2026-11-24T09:00:00+09:00", true, 9000),
    ],
    now,
  );
  assert.deepEqual(
    history.checks.map((item) => item.latencyMs),
    [100, null, 300],
  );
  assert.equal(history.ok, 2);
  assert.equal(history.failed, 1);
  assert.equal(history.averageLatencyMs, 200);
  assert.equal(history.maxLatencyMs, 300);
});

test("empty history has no average", () => {
  const history = healthHistory([], now);
  assert.equal(history.averageLatencyMs, null);
  assert.equal(history.maxLatencyMs, 0);
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
