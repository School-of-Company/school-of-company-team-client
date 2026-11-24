import assert from "node:assert/strict";
import { test } from "node:test";
import { menuPosition } from "./menu-position";

const viewport = { width: 1280, height: 900 };
const menu = { width: 208, height: 400 };
const at = (left: number, top: number) => ({
  left,
  right: left + 24,
  top,
  bottom: top + 24,
});

test("the menu opens below the button, right-aligned", () => {
  assert.deepEqual(menuPosition(at(500, 100), menu, viewport), {
    top: 128,
    left: 316,
  });
});

test("a button near the left edge shifts the menu into the viewport", () => {
  // 1280px 첫 컬럼 카드: 버튼 오른쪽 끝에 맞추면 화면 왼쪽 밖으로 나간다.
  assert.equal(menuPosition(at(100, 100), menu, viewport).left, 8);
});

test("a button near the bottom flips the menu above", () => {
  assert.equal(menuPosition(at(500, 800), menu, viewport).top, 396);
});

test("with no room on either side the menu stays inside the viewport", () => {
  const tall = { width: 208, height: 880 };
  const { top } = menuPosition(at(500, 450), tall, viewport);
  assert.ok(top >= 8 && top + tall.height <= viewport.height - 8 + 0.5);
});
