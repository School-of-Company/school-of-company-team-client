import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { activeSection } from "./scroll-spy";

const sections = [
  { id: "a", top: 0 },
  { id: "b", top: 150 },
  { id: "c", top: 900 },
  { id: "d", top: 1800 },
];
const at = (scrollTop: number) =>
  activeSection(sections, { scrollTop, clientHeight: 600, scrollHeight: 2000 });

describe("activeSection", () => {
  test("맨 위에서는 짧은 첫 절 아래 절이 읽는 선 안에 있어도 첫 절이다", () => {
    assert.equal(at(0), "a");
  });
  test("읽는 선(높이의 45%)을 넘은 마지막 절을 고른다", () => {
    assert.equal(at(10), "b");
    assert.equal(at(629), "b");
    assert.equal(at(630), "c");
  });
  test("끝까지 내리면 머리가 위에 닿지 못한 마지막 절이다", () => {
    assert.equal(at(1399), "d");
    assert.equal(at(1300), "c");
  });
  test("절이 없으면 고르지 않는다", () => {
    assert.equal(
      activeSection([], { scrollTop: 0, clientHeight: 1, scrollHeight: 1 }),
      undefined,
    );
  });
});
