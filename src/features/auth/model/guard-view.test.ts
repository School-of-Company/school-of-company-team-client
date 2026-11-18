import assert from "node:assert/strict";
import { test } from "node:test";
import { guardView } from "./guard-view";

const base = {
  ready: true,
  hasToken: true,
  isError: false,
  hasUser: true,
  redirecting: false,
};

test("before the session store is ready, a cached error still renders loading (matches SSR)", () => {
  assert.equal(
    guardView({ ...base, ready: false, isError: true, hasUser: false }),
    "loading",
  );
});

test("after hydration a failed me query shows the error state", () => {
  assert.equal(guardView({ ...base, isError: true, hasUser: false }), "error");
});

test("missing token, user or a pending redirect never renders protected content", () => {
  assert.equal(guardView({ ...base, hasToken: false }), "loading");
  assert.equal(guardView({ ...base, hasUser: false }), "loading");
  assert.equal(guardView({ ...base, redirecting: true }), "loading");
  assert.equal(guardView(base), "content");
});
