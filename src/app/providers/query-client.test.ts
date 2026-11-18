import { test } from "node:test";
import { strict as assert } from "node:assert";
import { ApiError } from "@/shared/api";
import { QueryObserver } from "@tanstack/react-query";
import { taskQueries } from "@/entities/task";
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

test("a fresh board survives navigation and renders immediately without a second request", async (context) => {
  const client = createQueryClient();
  context.after(() => client.clear());
  let requests = 0;
  const options = {
    ...taskQueries.board("scope=TEAM", false),
    queryFn: async () => {
      requests += 1;
      return {
        groups: [],
        counts: { BACKLOG: 0, PLANNED: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 },
      };
    },
  };
  await client.fetchQuery(options);
  const first = new QueryObserver(client, options);
  first.subscribe(() => {})();
  // Cross the GC timer turn that used to discard the board on unmount.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  const next = new QueryObserver(client, options);
  context.after(next.subscribe(() => {}));
  assert.equal(next.getCurrentResult().isPending, false);
  assert.equal(requests, 1);
});
