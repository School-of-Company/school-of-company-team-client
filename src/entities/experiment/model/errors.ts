import { normalizeApiError } from "@/shared/api";

const messages: Readonly<Record<string, string>> = {
  EXPERIMENT_NOT_FOUND:
    "실험이 없어요. 삭제되었을 수 있으니 목록에서 다시 고르세요.",
  EXPERIMENT_FORBIDDEN:
    "담당자, 만든 사람, 헤드 어드민만 바꿀 수 있어요. 삭제는 만든 사람과 헤드 어드민만 할 수 있어요.",
  EXPERIMENT_OUTCOME_REQUIRED:
    "완료하려면 결과(성공, 실패, 판단 보류)를 골라 주세요.",
  EXPERIMENT_LINK_TARGET_NOT_FOUND:
    "업무나 문서를 찾을 수 없거나 볼 권한이 없어요. 주소를 확인하세요.",
  ONBOARDING_REQUIRED: "가입 승인과 Discord 연결을 완료한 뒤 이용해 주세요.",
};

export function experimentErrorMessage(error: unknown): string {
  const problem = normalizeApiError(error);
  return messages[problem.code] ?? problem.message;
}
