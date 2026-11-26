import assert from "node:assert/strict";
import { test } from "node:test";
import { sessionRoleBootScript } from "./session";

const jwt = (payload: unknown) =>
  `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`;

function boot(token: string | null, storageThrows = false) {
  const root = { dataset: {} as Record<string, string> };
  new Function("document", "sessionStorage", "atob", sessionRoleBootScript)(
    { documentElement: root },
    {
      getItem: () => {
        if (storageThrows) throw new Error("blocked");
        return token;
      },
    },
    atob,
  );
  return root.dataset.sessionRole;
}

test("the access token's role claim is written before first paint", () => {
  assert.equal(boot(jwt({ sub: "u", role: "LEAD" })), "LEAD");
  assert.equal(
    boot(jwt({ sub: "u", role: "MEMBER", name: "김민지~?>" })),
    "MEMBER",
  );
});

test("no token, a malformed token or blocked storage leaves the role unset", () => {
  assert.equal(boot(null), undefined);
  assert.equal(boot("not-a-jwt"), undefined);
  assert.equal(boot("a.%%%.c"), undefined);
  assert.equal(boot(jwt({ sub: "u" })), undefined);
  assert.equal(boot(jwt({ role: "LEAD" }), true), undefined);
});
