import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COMMENT_MAX_LENGTH,
  commentBodyError,
  commentPermissions,
} from "./comments";

const author = { id: "u1", username: "kim", name: "김" };
const comment = { author };

test("the author can edit and delete their own comment", () => {
  assert.deepEqual(commentPermissions(comment, { id: "u1", role: "MEMBER" }), {
    canEdit: true,
    canDelete: true,
  });
});

test("a head admin can delete but not edit someone else's comment", () => {
  assert.deepEqual(commentPermissions(comment, { id: "u2", role: "LEAD" }), {
    canEdit: false,
    canDelete: true,
  });
});

test("other members and signed-out viewers get no actions", () => {
  const none = { canEdit: false, canDelete: false };
  assert.deepEqual(
    commentPermissions(comment, { id: "u2", role: "MEMBER" }),
    none,
  );
  assert.deepEqual(commentPermissions(comment, undefined), none);
  // 작성자를 모르는 댓글(탈퇴 등)은 본인 것으로 보지 않는다.
  assert.deepEqual(
    commentPermissions({ author: null }, { id: "u1", role: "MEMBER" }),
    none,
  );
});

test("comment body must be 1 to 10000 characters and not blank", () => {
  assert.ok(commentBodyError(""));
  assert.ok(commentBodyError("  \n "));
  assert.equal(commentBodyError("PR 올렸어요"), null);
  assert.equal(commentBodyError("a".repeat(COMMENT_MAX_LENGTH)), null);
  assert.ok(commentBodyError("a".repeat(COMMENT_MAX_LENGTH + 1)));
});
