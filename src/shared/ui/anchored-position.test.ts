import assert from "node:assert/strict";
import { test } from "node:test";
import { anchoredPosition, isOutOfView } from "./anchored-position";

const viewport = { width: 1280, height: 900 };
const menu = { width: 208, height: 400 };
const at = (left: number, top: number) => ({
  left,
  right: left + 24,
  top,
  bottom: top + 24,
});

test("the menu opens below the button, right-aligned", () => {
  assert.deepEqual(anchoredPosition(at(500, 100), menu, viewport), {
    top: 128,
    left: 316,
  });
});

test("a button near the left edge shifts the menu into the viewport", () => {
  // 1280px 첫 컬럼 카드: 버튼 오른쪽 끝에 맞추면 화면 왼쪽 밖으로 나간다.
  assert.equal(anchoredPosition(at(100, 100), menu, viewport).left, 8);
});

test("a button near the bottom flips the menu above", () => {
  assert.equal(anchoredPosition(at(500, 800), menu, viewport).top, 396);
});

test("with no room on either side the menu stays inside the viewport", () => {
  const tall = { width: 208, height: 880 };
  const { top } = anchoredPosition(at(500, 450), tall, viewport);
  assert.ok(top >= 8 && top + tall.height <= viewport.height - 8 + 0.5);
});

test("start alignment lines the panel up with the button's left edge", () => {
  assert.equal(
    anchoredPosition(at(500, 100), menu, viewport, "start").left,
    500,
  );
});

test("start alignment near the right edge shifts the panel into the viewport", () => {
  assert.equal(
    anchoredPosition(at(1200, 100), menu, viewport, "start").left,
    1280 - 8 - 208,
  );
});

test("on a 390px phone a right-aligned table button keeps the panel on screen", () => {
  const phone = { width: 390, height: 844 };
  const wide = { width: 358, height: 220 };
  const { top, left } = anchoredPosition(at(320, 300), wide, phone);
  assert.equal(top, 328);
  assert.ok(left >= 8 && left + wide.width <= phone.width - 8);
});

test("a trigger scrolled out of the viewport counts as out of view", () => {
  assert.equal(isOutOfView(at(500, -30), viewport), true);
  assert.equal(isOutOfView(at(500, 900), viewport), true);
  assert.equal(isOutOfView(at(500, -10), viewport), false);
  assert.equal(isOutOfView(at(500, 100), viewport), false);
});
