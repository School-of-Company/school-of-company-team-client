import { normalizeApiError } from "@/shared/api";

const messages: Readonly<Record<string, string>> = {
  KNOWLEDGE_NOT_FOUND:
    "문서가 없습니다. 삭제되었을 수 있으니 목록에서 다시 고르세요.",
  KNOWLEDGE_FORBIDDEN:
    "작성자·연결된 서비스 소유자·헤드 어드민만 바꿀 수 있습니다. 삭제는 작성자와 헤드 어드민만 할 수 있습니다.",
  // 화면이 대상 하나·자기 제외·대체는 문서만으로 막는다. 그래도 오면 서버 문구(이유 포함)를 그대로 보인다.
  KNOWLEDGE_LINK_EXISTS: "이미 연결된 대상입니다.",
  KNOWLEDGE_LINK_NOT_FOUND: "이미 해제된 관계입니다. 새로고침해 확인하세요.",
  PERSONAL_TASK_NOT_LINKABLE: "개인 업무는 문서에 연결할 수 없습니다.",
  TASK_NOT_FOUND:
    "업무를 찾을 수 없거나 볼 권한이 없습니다. 업무 주소나 ID를 확인하세요.",
  SERVICE_NOT_FOUND: "서비스가 없습니다. 다시 고르세요.",
  SERVICE_ARCHIVED: "아카이브된 서비스에는 새로 연결할 수 없습니다.",
  INCIDENT_NOT_FOUND: "사고가 없습니다. 다시 고르세요.",
  ONBOARDING_REQUIRED: "가입 승인과 Discord 연결을 완료한 뒤 이용해 주세요.",
};

export function knowledgeErrorMessage(error: unknown): string {
  const problem = normalizeApiError(error);
  return messages[problem.code] ?? problem.message;
}
