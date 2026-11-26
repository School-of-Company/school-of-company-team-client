import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resolveSection,
  sectionPath,
  sectionSegment,
  visibleSections,
} from "./sections";

test("경로 조각이 예전 ?tab= 보다 먼저다", () => {
  assert.equal(resolveSection("members", "buckets", true), "members");
  assert.equal(resolveSection(undefined, "buckets", false), "buckets");
  assert.equal(resolveSection(undefined, null, false), "general");
});

test("모르는 값과 볼 수 없는 섹션은 기본 정보다", () => {
  assert.equal(resolveSection("nope", null, true), "general");
  assert.equal(resolveSection("automation", null, false), "general");
  assert.equal(resolveSection(undefined, "intake", false), "general");
  assert.equal(resolveSection("intake", null, true), "intake");
});

test("관리자만 자동화와 접수 양식을 본다", () => {
  const ids = (manager: boolean) => visibleSections(manager).map((s) => s.id);
  assert.ok(!ids(false).includes("automation"));
  assert.ok(!ids(false).includes("intake"));
  assert.equal(ids(true).length, 7);
});

test("섹션 주소를 만들고 읽는다", () => {
  assert.equal(
    sectionPath("/projects/p/settings", "general"),
    "/projects/p/settings",
  );
  assert.equal(
    sectionPath("/projects/p/settings", "members"),
    "/projects/p/settings/members",
  );
  assert.equal(sectionSegment("/projects/p/settings/members"), "members");
  assert.equal(sectionSegment("/projects/p/settings"), undefined);
});
