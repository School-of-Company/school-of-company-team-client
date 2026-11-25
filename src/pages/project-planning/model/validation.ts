import { sprintErrorMessage, type SprintInput } from "@/entities/sprint";
import type { ApiError } from "@/shared/api";
import { goalItemsError } from "./goal-items";

/** 서버와 같은 기준(계약 DTO)으로 먼저 막는다. 키는 입력 이름. */
export function validateSprint(input: SprintInput) {
  const errors: Record<string, string> = {};
  if (!input.name || input.name.length > 100)
    errors.name = "이름은 1~100자로 입력하세요.";
  if (input.goal.length > 500) errors.goal = "목표는 500자 이하로 입력하세요.";
  const items = goalItemsError(input.goalItems);
  if (items) errors.goalItems = items;
  if (!input.startDate) errors.startDate = "시작일을 고르세요.";
  if (!input.endDate) errors.endDate = "종료일을 고르세요.";
  else if (input.startDate && input.endDate < input.startDate)
    errors.endDate = "종료일은 시작일과 같거나 뒤여야 합니다.";
  return errors;
}

export function sprintFormErrors(
  error: ApiError,
): Readonly<Record<string, string>> {
  if (
    error.code === "VALIDATION_ERROR" &&
    typeof error.details === "object" &&
    error.details !== null
  ) {
    const fields = Object.fromEntries(
      Object.entries(error.details).filter(
        ([key, value]) =>
          ["name", "goal", "startDate", "endDate", "goalItems"].includes(key) &&
          typeof value === "string",
      ),
    );
    if (Object.keys(fields).length) return fields;
  }
  if (error.code === "DUPLICATE_SPRINT_NAME")
    return { name: sprintErrorMessage(error) };
  return { form: sprintErrorMessage(error) };
}

export function validateRetro(body: string) {
  const text = body.trim();
  if (!text) return "내용을 입력하세요.";
  if (text.length > 1000) return "1000자 이하로 입력하세요.";
  return null;
}
