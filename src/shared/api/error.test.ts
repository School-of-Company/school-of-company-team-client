import { test } from "node:test";
import { strict as assert } from "node:assert";
import { AxiosError, AxiosHeaders } from "axios";
import { ApiError, normalizeApiError } from "./error";
import { api, setAccessRefresher, subscribeApiErrors } from "./instance";

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

test("an expired access token is refreshed once and the request replayed", async () => {
  let calls = 0;
  let refreshes = 0;
  const adapter = api.defaults.adapter;
  api.defaults.adapter = async (config) => {
    calls += 1;
    if (calls === 1)
      throw new AxiosError("expired", "ERR_BAD_REQUEST", config, undefined, {
        status: 401,
        statusText: "Unauthorized",
        headers: {},
        config,
        data: { code: "EXPIRED_TOKEN", message: "만료" },
      });
    return { data: "ok", status: 200, statusText: "OK", headers: {}, config };
  };
  setAccessRefresher(async () => {
    refreshes += 1;
    return true;
  });
  try {
    assert.equal((await api.get("/x")).data, "ok");
    assert.deepEqual([calls, refreshes], [2, 1]);
    // A failed refresh surfaces the 401 instead of looping.
    calls = 0;
    setAccessRefresher(async () => false);
    await assert.rejects(
      api.get("/x"),
      (e: unknown) => e instanceof ApiError && e.status === 401,
    );
    assert.equal(calls, 1);
  } finally {
    api.defaults.adapter = adapter;
    setAccessRefresher(async () => false);
  }
});
