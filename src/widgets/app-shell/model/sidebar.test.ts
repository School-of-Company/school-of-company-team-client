import assert from "node:assert/strict";
import { test } from "node:test";
import { isSidebarShortcut } from "./sidebar";

const event = {
  code: "Backslash",
  key: "₩",
  metaKey: true,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  repeat: false,
  isComposing: false,
  defaultPrevented: false,
};
test("sidebar shortcut uses the physical Backslash key with Korean or Latin input", () => {
  assert.ok(isSidebarShortcut(event));
  assert.ok(
    isSidebarShortcut({ ...event, key: "\\", metaKey: false, ctrlKey: true }),
  );
});
test("sidebar shortcut ignores IME, modified, repeated or consumed keystrokes", () => {
  for (const patch of [
    { isComposing: true },
    { defaultPrevented: true },
    { shiftKey: true },
    { altKey: true },
    { repeat: true },
    { code: "IntlBackslash" },
    { metaKey: false },
  ])
    assert.equal(isSidebarShortcut({ ...event, ...patch }), false);
});
