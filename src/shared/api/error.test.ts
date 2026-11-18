import { test } from "node:test";
import { strict as assert } from "node:assert";
import { AxiosError, AxiosHeaders } from "axios";
import { ApiError, normalizeApiError } from "./error";
import { api, subscribeApiErrors } from "./instance";

test("normalization preserves server authorization codes and is idempotent", () => {
  const error = new AxiosError(
    "request failed",
    "ERR_BAD_REQUEST",
    undefined,
    undefined,
    {
      status: 403,
      statusText: "Forbidden",
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { code: "SUSPENDED", message: "이용 중지" },
    },
  );
  const normalized = normalizeApiError(error);
  assert.equal(normalized.status, 403);
  assert.equal(normalized.code, "SUSPENDED");
  assert.equal(normalized.message, "이용 중지");
  assert.equal(normalizeApiError(normalized), normalized);
});

test("API error subscriptions receive normalized errors and clean up", async () => {
  const received: ApiError[] = [];
  const unsubscribe = subscribeApiErrors((error) => received.push(error));
  const request = () =>
    api.get("/test", {
      adapter: async () => {
        throw new AxiosError("offline", "ERR_NETWORK");
      },
    });
  await assert.rejects(request(), ApiError);
  assert.equal(received.length, 1);
  assert.equal(received[0]?.status, 0);
  unsubscribe();
  await assert.rejects(request(), ApiError);
  assert.equal(received.length, 1);
});
