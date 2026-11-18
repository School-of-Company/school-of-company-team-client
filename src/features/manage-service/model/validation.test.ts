import assert from "node:assert/strict";
import { test } from "node:test";
import { validateEnvironment, validateServiceForm } from "./validation";

test("service keys follow the server pattern", () => {
  const base = { name: "팀 서버", description: "", primaryOwnerId: "u1" };
  assert.deepEqual(validateServiceForm({ ...base, key: "team-server" }), {});
  for (const key of ["Team", "1abc", "a", "a_b", "a".repeat(41)])
    assert.ok(validateServiceForm({ ...base, key }).key, key);
});

test("name, description and primary owner limits match the contract", () => {
  const errors = validateServiceForm({
    key: "ok-key",
    name: "  ",
    description: "x".repeat(2001),
    primaryOwnerId: "",
  });
  assert.ok(errors.name && errors.description && errors.primaryOwnerId);
  assert.ok(
    validateServiceForm({ name: "x".repeat(101), description: "" }).name,
  );
  // 수정 폼은 key·소유자를 보내지 않으므로 검사하지 않는다.
  assert.deepEqual(validateServiceForm({ name: "이름", description: "" }), {});
});

test("deploy environment is 1-100 characters", () => {
  assert.ok(validateEnvironment(" "));
  assert.ok(validateEnvironment("x".repeat(101)));
  assert.equal(validateEnvironment("production"), undefined);
});
