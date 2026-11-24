import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError } from "@/shared/api";
import { isAccessLost } from "./access-lost";

test("403, 404 재조회는 권한을 잃은 것으로 보고 캐시를 내린다", () => {
  assert.equal(isAccessLost(new ApiError(403, "FORBIDDEN", "x")), true);
  assert.equal(isAccessLost(new ApiError(404, "NOT_FOUND", "x")), true);
});

test("5xx, 네트워크 오류, 오류 없음은 캐시를 두고 다시 시도 안내만 띄운다", () => {
  assert.equal(isAccessLost(new ApiError(500, "SERVER", "x")), false);
  assert.equal(isAccessLost(new ApiError(0, "REQUEST_FAILED", "x")), false);
  assert.equal(isAccessLost(null), false);
});
