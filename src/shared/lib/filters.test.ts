import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFilters, writeFilters, formatDate } from "./index";

test("filter updates preserve unrelated parameters and repeated OR values", () => {
  const original = new URLSearchParams("status=DONE&status=BACKLOG&sort=due");
  const updated = writeFilters(original, {
    status: ["REVIEW", "DONE", "REVIEW"],
    owner: [],
  });
  assert.deepEqual(readFilters(updated, ["status", "owner"]), {
    status: ["REVIEW", "DONE"],
    owner: [],
  });
  assert.equal(updated.get("sort"), "due");
  assert.deepEqual(original.getAll("status"), ["DONE", "BACKLOG"]);
});

test("date formatting handles missing and malformed dates and uses Seoul day", () => {
  assert.equal(formatDate(null), "—");
  assert.equal(formatDate("invalid"), "—");
  assert.equal(formatDate("2026-11-18T23:00:00Z"), "2026년 11월 19일");
});
