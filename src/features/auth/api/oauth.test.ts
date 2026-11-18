import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { api } from "@/shared/api";
import { clearSession, getAccessToken } from "@/entities/user";
import { completeOAuth, OAuthCallbackError } from "./oauth";

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "sessionStorage", {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
});
Object.defineProperty(globalThis, "window", { value: {} });

let requests = 0;
const server = createServer(async (request, response) => {
  requests += 1;
  let body = "";
  for await (const chunk of request) body += chunk;
  const input = JSON.parse(body);
  if (input.binding !== "browser-binding") {
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ code: "OAUTH_STATE_INVALID" }));
    return;
  }
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(
    JSON.stringify({
      accessToken: "test-access",
      refreshToken: "test-refresh",
      scope: "WORK",
    }),
  );
});

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  api.defaults.baseURL = `http://127.0.0.1:${address.port}`;
});
after(() => server.close());

test("missing browser binding rejects callback without issuing a request", async () => {
  const count = requests;
  await assert.rejects(
    completeOAuth("github", "?code=code&state=missing"),
    OAuthCallbackError,
  );
  assert.equal(requests, count);
  assert.equal(getAccessToken(), null);
});

test("duplicate callback consumes binding and exchanges once while replacing the session", async () => {
  storage.set("once", "browser-binding");
  const count = requests;
  await Promise.all([
    completeOAuth("github", "?code=code&state=once"),
    completeOAuth("github", "?code=code&state=once"),
  ]);
  assert.equal(requests - count, 1);
  assert.equal(storage.get("once"), undefined);
  assert.equal(getAccessToken(), "test-access");
  clearSession();
});

test("provider cancellation consumes binding without exchanging a code", async () => {
  storage.set("cancelled", "browser-binding");
  const count = requests;
  await assert.rejects(
    completeOAuth("discord", "?error=access_denied&state=cancelled"),
    OAuthCallbackError,
  );
  assert.equal(storage.get("cancelled"), undefined);
  assert.equal(requests, count);
});
