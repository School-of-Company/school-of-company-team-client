import { test } from "node:test";
import assert from "node:assert/strict";
import { isCancelledError, QueryClient } from "@tanstack/react-query";
import { clearSession, replaceSession } from "@/entities/user";
import { clearCacheOnSessionChange } from "./session-cache";

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
});

for (const operation of ["logout", "replacement"] as const) {
  test(`${operation} clears all user queries and mutations synchronously`, (context) => {
    const client = new QueryClient();
    context.after(clearCacheOnSessionChange(client));
    context.after(() => {
      client.clear();
      storage.clear();
    });
    client.setQueryData(["tasks", "private"], { title: "old account" });
    client.setQueryData(["identity", "me"], { id: "old account" });
    client.getMutationCache().build(client, { mutationKey: ["old mutation"] });

    if (operation === "logout") clearSession();
    else
      replaceSession({
        accessToken: "replacement",
        refreshToken: "refresh",
        scope: "WORK",
      });

    assert.equal(client.getQueryCache().getAll().length, 0);
    assert.equal(client.getMutationCache().getAll().length, 0);
  });
}

test("unsubscribing detaches the previous provider cache", () => {
  const client = new QueryClient();
  const unsubscribe = clearCacheOnSessionChange(client);
  unsubscribe();
  client.setQueryData(["kept"], "new provider owns this cache");
  clearSession();
  assert.equal(client.getQueryData(["kept"]), "new provider owns this cache");
  client.clear();
});

test("a response from the previous session cannot overwrite the replacement account", async (context) => {
  const client = new QueryClient();
  context.after(clearCacheOnSessionChange(client));
  context.after(() => {
    client.clear();
    storage.clear();
  });
  const response = Promise.withResolvers<{ readonly id: string }>();
  const queryFn = () => response.promise;
  const request = client.fetchQuery({
    queryKey: ["identity", "me"],
    queryFn,
  });
  const cancelled = assert.rejects(request, isCancelledError);

  replaceSession({
    accessToken: "replacement",
    refreshToken: "refresh",
    scope: "WORK",
  });
  client.setQueryData(["identity", "me"], { id: "replacement account" });
  response.resolve({ id: "previous account" });
  await cancelled;

  assert.deepEqual(client.getQueryData(["identity", "me"]), {
    id: "replacement account",
  });
});
