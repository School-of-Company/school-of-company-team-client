import { latestDate } from "@/shared/lib";
import type { ApiError } from "@/shared/api";

/** 시작일, 마감일 달력의 하한. 새 업무는 오늘부터, 마감일은 시작일보다 앞설 수 없다. */
export function dateBounds({
  today,
  creating,
  startDate,
}: {
  readonly today: string;
  readonly creating: boolean;
  readonly startDate: string;
}) {
  return {
    // 수정할 때는 이미 시작한 업무가 있으니 시작일에 하한을 두지 않는다.
    startMin: creating ? today : undefined,
    // 수정 화면의 지난 마감일은 그대로 보이지만 새로 고르는 날은 오늘 이후다.
    deadlineMin: latestDate(today, startDate),
  };
}

export type DateErrors = {
  readonly startDate?: string;
  readonly deadline?: string;
};

/** 폼 제출 전 날짜 검사. 바꾸지 않은 기존 값은 지난 날이어도 통과한다. */
export function dateErrors({
  today,
  creating,
  startDate,
  deadline,
  initialDeadline = "",
}: {
  readonly today: string;
  readonly creating: boolean;
  readonly startDate: string;
  readonly deadline: string;
  readonly initialDeadline?: string;
}): DateErrors {
  return {
    ...(creating && startDate && startDate < today
      ? { startDate: "시작일은 오늘 이후로 골라 주세요." }
      : {}),
    ...(deadline && deadline !== initialDeadline && deadline < today
      ? { deadline: "마감일은 오늘 이후로 골라 주세요." }
      : startDate && deadline && startDate > deadline
        ? { deadline: "마감일은 시작일과 같거나 늦어야 해요." }
        : {}),
  };
}

/**
 * 담당자와 리뷰어는 겹칠 수 없다(서버 TASK_REVIEWER_IS_ASSIGNEE).
 * 다른 쪽에 이미 고른 사람은 이 목록에서 막는다. 이 목록에 이미 들어 있으면(예전 데이터) 해제할 수 있게 둔다.
 */
export function overlapReason(
  id: string,
  own: readonly string[],
  other: readonly string[],
  reason: string,
): string | undefined {
  return !own.includes(id) && other.includes(id) ? reason : undefined;
}

export function overlapping(
  assignees: readonly string[],
  reviewers: readonly string[],
): readonly string[] {
  return reviewers.filter((id) => assignees.includes(id));
}

/** 서버 오류를 폼 문구로 바꾼다. */
export function taskErrorMessage(
  problem: Pick<ApiError, "code" | "message" | "details">,
  people: readonly { readonly id: string; readonly name: string }[],
): string {
  const details =
    problem.details && typeof problem.details === "object"
      ? (problem.details as Record<string, unknown>)
      : {};
  if (problem.code === "TASK_REVIEWER_IS_ASSIGNEE") {
    const name = people.find((person) => person.id === details.userId)?.name;
    return `${name ? name + "님은 " : ""}담당자라서 리뷰어로 지정할 수 없어요.`;
  }
  if (problem.code === "VALIDATION_ERROR" && details.field === "startDate")
    return "시작일은 마감일과 같거나 빨라야 해요.";
  return problem.message;
}
