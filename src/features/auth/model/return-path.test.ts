import assert from "node:assert/strict";
import { test } from "node:test";
import type { User } from "@/entities/user";
import {
  postLoginDestination,
  rememberReturnPath,
  safeReturnPath,
  takeReturnPath,
} from "./return-path";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
    items,
  };
}

const user: User = {
  id: "u1",
  username: "u",
  name: "U",
  major: null,
  role: "MEMBER",
  status: "ACTIVE",
  createdAt: "2026-11-18T00:00:00Z",
  githubId: 1,
  githubLogin: "u",
  discordLinked: true,
  discordUsername: "u",
};

test("only same-origin relative paths are accepted", () => {
  assert.equal(safeReturnPath("/tasks/T1?tab=a#c"), "/tasks/T1?tab=a#c");
  assert.equal(
    safeReturnPath("/projects/P1/sprints/S1"),
    "/projects/P1/sprints/S1",
  );
  for (const bad of [
    "//evil.example/x",
    "/\\evil.example",
    "https://evil.example/",
    "javascript:alert(1)",
    "tasks/T1",
    "",
    "/login",
    "/auth/github/callback?code=x",
    "/pending",
    "/connect-discord",
    "/",
    null,
    42,
  ])
    assert.equal(safeReturnPath(bad), null, String(bad));
});

test("a Discord link opened in a new tab comes back after login, once", () => {
  const storage = memoryStorage();
  rememberReturnPath(
    { pathname: "/incidents/I1", search: "?x=1", hash: "" },
    storage,
    1000,
  );
  assert.equal(postLoginDestination(user, storage, 2000), "/incidents/I1?x=1");
  assert.equal(postLoginDestination(user, storage, 3000), "/");
});

test("users who cannot work yet go to their status screen and keep the path for later", () => {
  const storage = memoryStorage();
  rememberReturnPath(
    { pathname: "/tasks/T1", search: "", hash: "" },
    storage,
    0,
  );
  assert.equal(
    postLoginDestination({ ...user, discordLinked: false }, storage, 1),
    "/connect-discord",
  );
  assert.equal(
    postLoginDestination({ ...user, status: "PENDING" }, storage, 1),
    "/pending",
  );
  assert.equal(postLoginDestination(user, storage, 2), "/tasks/T1");
});

test("expired, tampered or replaced entries are dropped", () => {
  const storage = memoryStorage();
  rememberReturnPath(
    { pathname: "/tasks/T1", search: "", hash: "" },
    storage,
    0,
  );
  assert.equal(takeReturnPath(storage, 31 * 60 * 1000), null);
  assert.equal(storage.items.size, 0);

  storage.setItem(
    "soc.return-path",
    JSON.stringify({ path: "//evil.example", at: 0 }),
  );
  assert.equal(takeReturnPath(storage, 1), null);
  storage.setItem("soc.return-path", "not json");
  assert.equal(takeReturnPath(storage, 1), null);

  rememberReturnPath(
    { pathname: "/tasks/T1", search: "", hash: "" },
    storage,
    0,
  );
  rememberReturnPath({ pathname: "/", search: "", hash: "" }, storage, 1);
  assert.equal(takeReturnPath(storage, 2), null);
});
