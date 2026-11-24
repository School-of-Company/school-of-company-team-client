import assert from "node:assert/strict";
import { test } from "node:test";
import { validateProjectImage } from "./image";

test("project images accept PNG, JPEG and WebP up to and including 2MB", () => {
  for (const type of ["image/png", "image/jpeg", "image/webp"])
    assert.equal(validateProjectImage({ type, size: 2 * 1024 * 1024 }), null);
});

test("project images reject empty, oversized and unsupported files before upload", () => {
  for (const file of [
    { type: "image/png", size: 0 },
    { type: "image/jpeg", size: 2 * 1024 * 1024 + 1 },
    { type: "image/svg+xml", size: 100 },
    { type: "image/gif", size: 100 },
    { type: "", size: 100 },
  ])
    assert.notEqual(validateProjectImage(file), null);
});
