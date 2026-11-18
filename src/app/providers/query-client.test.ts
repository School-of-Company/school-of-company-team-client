import { test } from "node:test";
import { strict as assert } from "node:assert";
import { ApiError } from "@/shared/api";
import { createQueryClient } from "./query-client";

test("query retry avoids authorization failures while transient failures retry twice", () => {
  const retry = createQueryClient().getDefaultOptions().queries?.retry;
  assert.equal(typeof retry, "function");
  if (typeof retry !== "function") return;
  assert.equal(retry(0, new ApiError(403, "SUSPENDED", "suspended")), false);
  assert.equal(retry(0, new ApiError(404, "TASK_NOT_FOUND", "missing")), false);
  assert.equal(retry(1, new ApiError(503, "UNAVAILABLE", "unavailable")), true);
  assert.equal(
    retry(2, new ApiError(503, "UNAVAILABLE", "unavailable")),
    false,
  );
});
