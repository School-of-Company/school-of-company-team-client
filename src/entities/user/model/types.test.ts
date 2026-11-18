import assert from "node:assert/strict";
import { test } from "node:test";
import { isHeadAdmin, userDestination, type User } from "./types";

const user: User = {
  id: "test-user",
  username: "test",
  name: "Test",
  major: null,
  role: "LEAD",
  status: "ACTIVE",
  createdAt: "2026-11-18T00:00:00Z",
  githubId: 123,
  githubLogin: "test",
  discordLinked: true,
  discordUsername: "test",
};

for (const status of ["PENDING", "REJECTED", "SUSPENDED"] as const) {
  test(`${status} users see status guidance even when Discord is linked`, () => {
    assert.equal(userDestination({ ...user, status }), "/pending");
    assert.equal(isHeadAdmin({ ...user, status }), false);
  });
}

test("an approved administrator without Discord must connect before entering work", () => {
  assert.equal(
    userDestination({ ...user, discordLinked: false }),
    "/connect-discord",
  );
});

test("approved and linked users enter their board while only LEAD sees administration", () => {
  assert.equal(userDestination(user), "/me");
  assert.equal(isHeadAdmin(user), true);
  assert.equal(isHeadAdmin({ ...user, role: "MEMBER" }), false);
});
