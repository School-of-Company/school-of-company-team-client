import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError } from "@/shared/api";
import { retryAfterSeconds } from "./health-run";

test("429 waits for details.retryAfter, rounded up", () => {
  assert.equal(
    retryAfterSeconds(
      new ApiError(429, "TOO_MANY_REQUESTS", "x", { retryAfter: 6.2 }),
    ),
    7,
  );
});

test("429 without details falls back to the 10 second limit", () => {
  assert.equal(
    retryAfterSeconds(new ApiError(429, "TOO_MANY_REQUESTS", "x")),
    10,
  );
});

test("other errors do not start a wait", () => {
  assert.equal(
    retryAfterSeconds(
      new ApiError(409, "OPS_HEALTH_CHECK_NOT_CONFIGURED", "x"),
    ),
    null,
  );
});
