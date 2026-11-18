import assert from "node:assert/strict";
import { test } from "node:test";
import type { User } from "@/entities/user";
import { guardDestination } from "./guard-destination";

const user: User = {
  id: "account-user",
  username: "account",
  name: "Account",
  major: null,
  role: "MEMBER",
  status: "ACTIVE",
  createdAt: "2026-11-18T00:00:00Z",
  githubId: 1,
  githubLogin: "account",
  discordLinked: false,
  discordUsername: null,
};

test("active users without Discord may access their account while work still requires connection", () => {
  assert.equal(guardDestination(user, "account"), null);
  assert.equal(guardDestination(user, "work"), "/connect-discord");
});

for (const status of ["PENDING", "REJECTED", "SUSPENDED"] as const) {
  test(`${status} cannot bypass approval through account access`, () => {
    assert.equal(guardDestination({ ...user, status }, "account"), "/pending");
  });
}

test("linked active users may access both work and account", () => {
  assert.equal(
    guardDestination({ ...user, discordLinked: true }, "account"),
    null,
  );
  assert.equal(
    guardDestination({ ...user, discordLinked: true }, "work"),
    null,
  );
});
