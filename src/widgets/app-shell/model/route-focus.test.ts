import assert from "node:assert/strict";
import { test } from "node:test";
import { headingAnnouncement, shouldFocusMain } from "./route-focus";

const inside = { id: "inside" };
const main = { contains: (node: unknown) => node === inside };
const body = { id: "body" };

test("focus moves to main when the old focus vanished with the previous page", () => {
  assert.equal(shouldFocusMain(body, main, body), true);
  assert.equal(shouldFocusMain(null, main, body), true);
});

test("focus moves to main from the sidebar or drawer (outside main)", () => {
  assert.equal(shouldFocusMain({ id: "sidebar-link" }, main, body), true);
});

test("a new page that focused its own element keeps it", () => {
  assert.equal(shouldFocusMain(inside, main, body), false);
});

test("announcement uses the page heading and waits while it is missing", () => {
  assert.equal(headingAnnouncement("  팀 공용\n 보드 "), "팀 공용 보드 화면");
  assert.equal(headingAnnouncement(""), null);
  assert.equal(headingAnnouncement(null), null);
});
