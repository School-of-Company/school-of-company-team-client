import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError } from "@/shared/api";
import { githubLinkFailureReason } from "./github-error";

test("일괄 연결 실패 사유는 서버 오류 코드를 짧은 문구로 바꾼다", () => {
  const reason = (code: string, message = "서버 문구") =>
    githubLinkFailureReason(new ApiError(403, code, message));
  assert.equal(
    reason("GITHUB_NO_REPOSITORY_ACCESS"),
    "원본 저장소 접근 권한 없음",
  );
  assert.equal(
    reason("GITHUB_REPOSITORY_ALREADY_LINKED"),
    "이미 연결된 저장소",
  );
  assert.equal(
    reason("GITHUB_REPOSITORY_NOT_INSTALLED"),
    "GitHub App에 허용되지 않은 저장소",
  );
  assert.equal(reason("SOMETHING_ELSE", "알 수 없는 오류"), "알 수 없는 오류");
});
