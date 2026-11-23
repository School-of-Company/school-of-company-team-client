// 계약: 서버 docs/spec/s11-calendar.md. EVENT 만 고치고, 나머지는 원본(업무·마일스톤·Sprint·실험)을 비춘다.
import type { UserSummary } from "@/entities/user";

export type CalendarItemKind =
  "EVENT" | "TASK" | "MILESTONE" | "SPRINT" | "EXPERIMENT";

export type CalendarItem = {
  readonly kind: CalendarItemKind;
  readonly id: string;
  readonly title: string;
  readonly startDate: string;
  readonly endDate: string;
  /** EVENT 만. "HH:mm:ss", 없으면 종일. */
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly projectId: string | null;
  readonly projectKey: string | null;
  readonly taskKey: string | null;
  readonly status: string | null;
  readonly description: string | null;
  readonly createdBy: UserSummary | null;
  readonly canEdit: boolean;
};

export type CalendarEventInput = {
  readonly title: string;
  readonly description: string;
  readonly startDate: string;
  readonly endDate: string;
  /** 빈 문자열 = 종일. */
  readonly startTime: string;
  readonly endTime: string;
};

export const CALENDAR_TITLE_MAX = 100;
export const CALENDAR_DESCRIPTION_MAX = 2000;

/** 서버 규칙(D11-1)을 먼저 본다. 키는 입력 이름, 값은 보여줄 문장. */
export function validateCalendarEvent(
  input: CalendarEventInput,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.title.trim()) errors.title = "제목을 입력하세요.";
  if (!input.startDate) errors.startDate = "시작일을 고르세요.";
  if (!input.endDate) errors.endDate = "종료일을 고르세요.";
  else if (input.startDate && input.endDate < input.startDate)
    errors.endDate = "종료일은 시작일보다 이를 수 없습니다.";
  if (!!input.startTime !== !!input.endTime)
    errors.endTime = "시작·종료 시각을 함께 고르세요.";
  else if (
    input.startTime &&
    input.startDate === input.endDate &&
    input.endTime < input.startTime
  )
    errors.endTime = "종료 시각은 시작 시각보다 이를 수 없습니다.";
  return errors;
}

const errors: Readonly<Record<string, string>> = {
  CALENDAR_EVENT_NOT_FOUND:
    "일정이 없거나 볼 권한이 없습니다. 이미 지워졌을 수 있습니다.",
  CALENDAR_EVENT_FORBIDDEN:
    "만든 사람, PM, 헤드 어드민만 일정을 고치거나 지울 수 있습니다.",
  CALENDAR_RANGE_INVALID: "조회 기간이 너무 깁니다. 달을 바꿔 다시 보세요.",
  PROJECT_FORBIDDEN: "이 프로젝트는 볼 수만 있습니다.",
  PROJECT_ARCHIVED: "아카이브된 프로젝트는 조회만 가능합니다.",
  PROJECT_NOT_FOUND: "프로젝트가 없거나 볼 수 없습니다.",
};

export function calendarErrorMessage(error: {
  readonly code: string;
  readonly message: string;
}) {
  return errors[error.code] ?? error.message;
}
