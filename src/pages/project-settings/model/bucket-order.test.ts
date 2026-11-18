import assert from "node:assert/strict";
import { test } from "node:test";
import { bucketOrderAfterMove } from "./bucket-order";

const buckets = [
  { id: "A", archived: false },
  { id: "X", archived: true },
  { id: "B", archived: false },
  { id: "C", archived: false },
];

test("bucket moves swap among active buckets and keep archived ones in the full list", () => {
  assert.deepEqual(bucketOrderAfterMove(buckets, "B", -1), [
    "B",
    "A",
    "C",
    "X",
  ]);
  assert.deepEqual(bucketOrderAfterMove(buckets, "B", 1), ["A", "C", "B", "X"]);
  assert.equal(bucketOrderAfterMove(buckets, "A", -1), null);
  assert.equal(bucketOrderAfterMove(buckets, "C", 1), null);
  assert.equal(bucketOrderAfterMove(buckets, "X", 1), null);
});
