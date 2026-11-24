import assert from "node:assert/strict";
import { test } from "node:test";
import {
  closedGroupsFromStorage,
  isSidebarShortcut,
  sidebarProjects,
  withGroupClosed,
} from "./sidebar";

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
test("50 projects keep seven recent shortcuts and search the entire list", () => {
  const projects = Array.from({ length: 50 }, (_, index) => ({
    id: String(index),
    key: `SOC${index}`,
    name: `프로젝트 ${index}`,
  }));
  const shortcuts = sidebarProjects(projects, ["49", "22", "gone"], "");
  assert.equal(shortcuts.length, 7);
  assert.deepEqual(
    shortcuts.slice(0, 2).map((project) => project.id),
    ["49", "22"],
  );
  assert.equal(new Set(shortcuts.map((project) => project.id)).size, 7);
  assert.deepEqual(
    sidebarProjects(projects, [], " soc49 ").map((project) => project.id),
    ["49"],
  );
  assert.deepEqual(sidebarProjects(projects, [], "없는 프로젝트"), []);
  assert.deepEqual(sidebarProjects([], ["49"], ""), []);
});
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

test("접힘 속성은 바꾼 묶음만 더하거나 빼고 다른 묶음은 그대로 둔다", () => {
  assert.equal(
    withGroupClosed("org account", "work", true),
    "org account work",
  );
  assert.equal(withGroupClosed("org account", "org", false), "account");
  assert.equal(withGroupClosed(undefined, "org", false), "");
  assert.equal(withGroupClosed("org", "org", true), "org");
});

test("다른 탭에서 바꾼 접힘은 저장 값으로 속성을 다시 만든다", () => {
  const values: Record<string, string> = {
    "soc.sidebar.group.org": "true",
    "soc.sidebar.group.work": "false",
    "soc.sidebar.collapsed": "true",
    "soc.sidebar.group.account": "true",
  };
  const keys = Object.keys(values);
  const storage = {
    length: keys.length,
    key: (index: number) => keys[index] ?? null,
    getItem: (key: string) => values[key] ?? null,
  };
  assert.equal(closedGroupsFromStorage(storage), "org account");
});
