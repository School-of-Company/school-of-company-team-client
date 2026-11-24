import assert from "node:assert/strict";
import { test } from "node:test";
import {
  claudeCodeSnippet,
  closedTokenDialog,
  codexSnippet,
  mcpEndpoint,
  tokenDialogReducer,
  type CreatedApiToken,
} from "./api-token";

const created: CreatedApiToken = {
  id: "t1",
  name: "노트북",
  scope: "READ",
  prefix: "sct_ab12",
  token: "sct_ab12_secret-value",
  expiresAt: "2026-12-24T00:00:00Z",
  createdAt: "2026-11-24T00:00:00Z",
};

test("closing the dialog drops the plaintext token from state", () => {
  let state = tokenDialogReducer(closedTokenDialog, { type: "open" });
  state = tokenDialogReducer(state, { type: "created", token: created });
  assert.ok(JSON.stringify(state).includes(created.token));
  state = tokenDialogReducer(state, { type: "close" });
  assert.deepEqual(state, { open: false });
  assert.ok(!JSON.stringify(state).includes(created.token));
  // 다시 열어도 이전 토큰은 돌아오지 않는다.
  state = tokenDialogReducer(state, { type: "open" });
  assert.deepEqual(state, { open: true, created: null });
});

test("a late create response after close is not kept", () => {
  const state = tokenDialogReducer(closedTokenDialog, {
    type: "created",
    token: created,
  });
  assert.deepEqual(state, { open: false });
});

test("setup snippets carry the endpoint and bearer token", () => {
  const endpoint = mcpEndpoint("https://api.example.com/");
  assert.equal(endpoint, "https://api.example.com/mcp");
  assert.equal(
    claudeCodeSnippet(endpoint, "tok"),
    'claude mcp add --transport http hub https://api.example.com/mcp --header "Authorization: Bearer tok"',
  );
  assert.match(
    codexSnippet(endpoint, "tok"),
    /url = "https:\/\/api\.example\.com\/mcp"/,
  );
  assert.match(codexSnippet(endpoint, "tok"), /Authorization = "Bearer tok"/);
});
