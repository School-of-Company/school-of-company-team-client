import assert from "node:assert/strict";
import { test } from "node:test";
import { validateDiscordChannel } from "./validation";

test("Discord channel IDs remain strings and private project linking requires explicit confirmation", () => {
  assert.equal(validateDiscordChannel("12345678901234567", false, false), null);
  assert.equal(
    validateDiscordChannel("12345678901234567890", true, true),
    null,
  );
  assert.notEqual(
    validateDiscordChannel("12345678901234567", true, false),
    null,
  );
  for (const id of [
    "1234567890123456",
    "123456789012345678901",
    "1234567890123456x",
  ]) {
    assert.notEqual(validateDiscordChannel(id, false, false), null);
  }
});
