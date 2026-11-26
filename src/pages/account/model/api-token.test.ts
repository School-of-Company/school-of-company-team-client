import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { createTokenForDialog } from "../api/tokens";
import {
  claudeCodeSnippet,
  closedTokenDialog,
  codexSnippet,
  defaultExpiry,
  discardTokenOnHide,
  expiryOptions,
  mcpEndpoint,
  tokenDialogReducer,
  tokenRequest,
  type CreatedApiToken,
  type TokenDialog,
  type TokenDialogAction,
} from "./api-token";

const created: CreatedApiToken = {
  id: "t1",
  name: "노트북",
  scope: "READ",
  prefix: "sct_ab12",
  token: "sct_ab12_secret-value",
  projectKeys: null,
  expiresAt: "2026-12-24T00:00:00Z",
  createdAt: "2026-11-24T00:00:00Z",
};
const other: CreatedApiToken = {
  ...created,
  id: "t2",
  token: "sct_cd34_other",
};

const run = (state: TokenDialog, ...actions: TokenDialogAction[]) =>
  actions.reduce(tokenDialogReducer, state);

test("closing the dialog drops the plaintext token from state", () => {
  let state = run(closedTokenDialog, { type: "open" });
  state = run(state, {
    type: "created",
    generation: state.generation,
    token: created,
  });
  assert.ok(JSON.stringify(state).includes(created.token));
  state = run(state, { type: "close" });
  assert.equal(state.open, false);
  assert.ok(!JSON.stringify(state).includes(created.token));
  // 다시 열어도 이전 토큰은 돌아오지 않는다.
  state = run(state, { type: "open" });
  assert.equal(state.open && state.created, null);
});

test("a late create response after close is not kept", () => {
  const opened = run(closedTokenDialog, { type: "open" });
  const state = run(
    opened,
    { type: "close" },
    {
      type: "created",
      generation: opened.generation,
      token: created,
    },
  );
  assert.ok(!JSON.stringify(state).includes(created.token));
});

test("a reopened dialog ignores the response of the earlier request", () => {
  const first = run(closedTokenDialog, { type: "open" });
  const second = run(first, { type: "close" }, { type: "open" });
  let state = run(second, {
    type: "created",
    generation: first.generation,
    token: created,
  });
  assert.equal(state.open && state.created, null);
  state = run(state, {
    type: "created",
    generation: second.generation,
    token: other,
  });
  assert.equal(state.open && state.created?.token, other.token);
  // 같은 세대에 두 번째 응답이 와도 보이는 토큰을 덮어쓰지 않는다.
  state = run(state, {
    type: "created",
    generation: second.generation,
    token: created,
  });
  assert.equal(state.open && state.created?.token, other.token);
});

test("hiding or unmounting the page (effect cleanup) drops the token", () => {
  let state = run(closedTokenDialog, { type: "open" });
  state = run(state, {
    type: "created",
    generation: state.generation,
    token: created,
  });
  const cleanup = discardTokenOnHide((action) => {
    state = tokenDialogReducer(state, action);
  });
  cleanup();
  assert.equal(state.open, false);
  assert.ok(!JSON.stringify(state).includes(created.token));
  // Activity 가 다시 보이게 되어도 대화상자는 닫힌 채다.
  assert.equal(run(state).open, false);
});

test("creating a token leaves no plaintext in the query or mutation cache", async () => {
  const client = new QueryClient();
  const events: string[] = [];
  const unsubscribeQueries = client.getQueryCache().subscribe((event) => {
    events.push(JSON.stringify(event.query.state));
  });
  const unsubscribeMutations = client.getMutationCache().subscribe((event) => {
    events.push(JSON.stringify(event?.mutation?.state ?? null));
  });
  let delivered: CreatedApiToken | null = null;
  await createTokenForDialog(
    client,
    { name: "노트북", scope: "READ", expiresInDays: 30 },
    (token) => {
      delivered = token;
    },
    async () => created,
  );
  unsubscribeQueries();
  unsubscribeMutations();
  assert.equal(delivered, created);
  assert.equal(client.getMutationCache().getAll().length, 0);
  const caches = JSON.stringify([
    client
      .getMutationCache()
      .getAll()
      .map((mutation) => mutation.state),
    client
      .getQueryCache()
      .getAll()
      .map((query) => query.state),
    events,
  ]);
  assert.ok(!caches.includes(created.token));
});

test("setup snippets carry the endpoint and read the token from HUB_TOKEN", () => {
  const endpoint = mcpEndpoint("https://api.example.com/");
  assert.equal(endpoint, "https://api.example.com/mcp");
  assert.equal(
    claudeCodeSnippet(endpoint),
    'claude mcp add --scope user --transport http hub "https://api.example.com/mcp" --header "Authorization: Bearer $HUB_TOKEN"',
  );
  assert.equal(
    codexSnippet(endpoint),
    '[mcp_servers.hub]\nurl = "https://api.example.com/mcp"\nbearer_token_env_var = "HUB_TOKEN"',
  );
});

test("token request omits projectKeys for an unrestricted token", () => {
  assert.deepEqual(
    tokenRequest({
      name: "  노트북 ",
      scope: "WRITE",
      expiresInDays: 30,
      restricted: false,
      projectKeys: ["HUB"],
    }),
    { body: { name: "노트북", scope: "WRITE", expiresInDays: 30 } },
  );
});

test("token request upper-cases, dedupes and bounds project keys to 1-20", () => {
  const input = {
    name: "agent",
    scope: "READ" as const,
    expiresInDays: 7,
    restricted: true,
  };
  assert.deepEqual(
    tokenRequest({ ...input, projectKeys: ["hub", "HUB ", "web"] }),
    {
      body: {
        ...{ name: "agent", scope: "READ", expiresInDays: 7 },
        projectKeys: ["HUB", "WEB"],
      },
    },
  );
  assert.ok("error" in tokenRequest({ ...input, projectKeys: [] }));
  const many = Array.from({ length: 21 }, (_, index) => `P${index}`);
  assert.ok("error" in tokenRequest({ ...input, projectKeys: many }));
  assert.ok(
    "body" in tokenRequest({ ...input, projectKeys: many.slice(0, 20) }),
  );
  assert.ok(
    "error" in tokenRequest({ ...input, name: "  ", projectKeys: ["HUB"] }),
  );
});

test("expiry options follow the team policy limit", () => {
  assert.deepEqual(expiryOptions(90), [
    { days: 7, allowed: true },
    { days: 30, allowed: true },
    { days: 90, allowed: true },
  ]);
  assert.deepEqual(expiryOptions(14), [
    { days: 7, allowed: true },
    { days: 14, allowed: true },
    { days: 30, allowed: false },
    { days: 90, allowed: false },
  ]);
  assert.equal(defaultExpiry(90), 30);
  assert.equal(defaultExpiry(14), 14);
});
