import assert from "node:assert/strict";
import { test } from "node:test";
import { relativeSince } from "./index";

test("under a minute reads as 방금, not Intl's 현재 분", () => {
  const now = Date.parse("2026-11-19T10:00:30+09:00");
  assert.equal(relativeSince("2026-11-19T10:00:00+09:00", now), "방금");
  assert.equal(relativeSince("2026-11-19T09:55:30+09:00", now), "5분 전");
  assert.equal(relativeSince("2026-11-19T05:00:00+09:00", now), "5시간 전");
});
