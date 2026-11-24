import { normalizeApiError } from "@/shared/api";

// 오류 코드 → 화면 문구(서버 docs/spec/s12-intake.md 3.3절). 코드가 없으면 서버 메시지를 쓴다.
const messages: Readonly<Record<string, string>> = {
  INTAKE_FORM_NOT_FOUND:
    "접수 링크를 찾을 수 없습니다. 링크가 바뀌었거나 닫혔을 수 있으니 담당자에게 새 링크를 요청해 주세요.",
  INTAKE_FORM_CLOSED:
    "이 양식은 접수가 마감되었습니다. 담당자에게 문의해 주세요.",
  INTAKE_CONSENT_REQUIRED: "개인정보 수집·이용에 동의해야 제출할 수 있습니다.",
  INTAKE_TOO_FAST:
    "제출을 처리하지 못했습니다. 양식을 새로 받았으니 잠시 뒤 다시 제출해 주세요.",
  INTAKE_DAILY_LIMIT:
    "오늘 이 양식의 접수 한도에 도달했습니다. 내일 다시 시도해 주세요. 작성한 내용은 이 화면을 닫기 전까지 남아 있습니다.",
  REQUIREMENT_NOT_FOUND:
    "요구사항을 찾을 수 없습니다. 링크가 재발급되었거나 삭제되었을 수 있습니다.",
  REQUIREMENT_FORBIDDEN:
    "이 요구사항을 관리할 권한이 없습니다. PM 또는 헤드 어드민에게 요청하세요.",
  REQUIREMENT_STATUS_INVALID:
    "지금 상태에서는 할 수 없는 변경입니다. 새로고침해 현재 상태를 확인하세요.",
  REQUIREMENT_REASON_REQUIRED: "보류·반려에는 사유가 필요합니다.",
  REQUIREMENT_CLOSED: "철회했거나 닫힌 요구사항에는 답글을 달 수 없습니다.",
  REQUIREMENT_PROJECT_REQUIRED:
    "조직 단위 요구사항은 프로젝트를 지정한 뒤 업무를 만들 수 있습니다.",
  REQUIREMENT_TASK_NOT_ALLOWED:
    "연결할 수 없는 업무입니다. 같은 프로젝트 업무(조직 단위는 팀 공용 업무)만 연결합니다.",
  REQUIREMENT_TASK_ALREADY_LINKED: "이미 연결된 업무입니다.",
  REQUIREMENT_MESSAGE_NOT_FOUND:
    "이미 지워진 메시지입니다. 새로고침해 확인하세요.",
  TASK_NOT_FOUND: "업무를 찾을 수 없거나 연결할 권한이 없습니다.",
  PROJECT_NOT_FOUND: "프로젝트를 찾을 수 없습니다.",
  PROJECT_FORBIDDEN: "PM 또는 헤드 어드민만 할 수 있습니다.",
  PROJECT_ARCHIVED:
    "아카이브된 프로젝트입니다. 조회만 가능합니다. 복원한 뒤 다시 시도하세요.",
  ACCESS_DENIED: "헤드 어드민 권한이 필요합니다.",
  VALIDATION_ERROR: "입력값을 확인하세요.",
};

export function requirementErrorMessage(error: unknown): string {
  const problem = normalizeApiError(error);
  if (problem.code === "TOO_MANY_REQUESTS") {
    const retryAfter = retryAfterSeconds(problem.details);
    return retryAfter
      ? `요청이 너무 많습니다. ${retryAfter}초 뒤에 다시 시도해 주세요.`
      : "요청이 너무 많습니다. 잠시 뒤에 다시 시도해 주세요.";
  }
  if (problem.status === 0) return problem.message;
  return messages[problem.code] ?? problem.message;
}

export function retryAfterSeconds(details: unknown): number | null {
  if (typeof details !== "object" || details === null) return null;
  const value = (details as { retryAfter?: unknown }).retryAfter;
  return typeof value === "number" && value > 0 ? Math.ceil(value) : null;
}
