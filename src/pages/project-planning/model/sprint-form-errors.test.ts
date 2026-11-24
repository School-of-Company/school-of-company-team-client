import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError } from "@/shared/api";
import { sprintFormErrors, validateSprint } from "./validation";

test("server date validation is attached to endDate rather than a form alert", () => {
  const error = new ApiError(400, "VALIDATION_ERROR", "입력 오류", {
    endDate: "종료일은 시작일과 같거나 뒤여야 합니다.",
  });
  assert.deepEqual(sprintFormErrors(error), {
    endDate: "종료일은 시작일과 같거나 뒤여야 합니다.",
  });
});

test("malformed validation details and unrelated failures remain visible as form errors", () => {
  for (const details of [
    null,
    "endDate",
    { endDate: 42 },
    { unrelated: "오류" },
  ]) {
    assert.deepEqual(
      sprintFormErrors(
        new ApiError(400, "VALIDATION_ERROR", "입력 오류", details),
      ),
      { form: "입력 오류" },
    );
  }
  assert.deepEqual(
    sprintFormErrors(new ApiError(0, "REQUEST_FAILED", "연결 실패")),
    { form: "연결 실패" },
  );
});

test("duplicate sprint names attach to the name field", () => {
  assert.deepEqual(
    Object.keys(
      sprintFormErrors(new ApiError(409, "DUPLICATE_SPRINT_NAME", "중복")),
    ),
    ["name"],
  );
});

test("sprint goals accept 500 characters and reject 501", () => {
  const input = {
    name: "목표",
    goal: "가".repeat(500),
    startDate: "2026-11-24",
    endDate: "2026-11-24",
  };
  assert.deepEqual(validateSprint(input), {});
  assert.deepEqual(
    Object.keys(validateSprint({ ...input, goal: `${input.goal}나` })),
    ["goal"],
  );
});
