import { normalizeApiError } from "@/shared/api";

const messages: Readonly<Record<string, string>> = {
  WHITEBOARD_NOT_FOUND:
    "화이트보드가 없거나 볼 권한이 없습니다. 목록에서 다시 고르세요.",
  WHITEBOARD_FORBIDDEN:
    "만든 사람, PM, 헤드 어드민만 화이트보드를 지울 수 있습니다.",
  WHITEBOARD_CONFLICT:
    "다른 사람이 먼저 저장했습니다. 최신 내용과 합친 뒤 다시 저장합니다.",
  WHITEBOARD_SCENE_INVALID: "화이트보드 내용을 읽을 수 없습니다.",
  WHITEBOARD_FILES_NOT_ALLOWED:
    "이미지·파일·웹 임베드는 넣을 수 없습니다. 지운 뒤 다시 저장됩니다.",
  WHITEBOARD_LINK_NOT_ALLOWED:
    "링크는 http(s) 주소나 /로 시작하는 경로만 쓸 수 있습니다.",
  WHITEBOARD_TOO_LARGE:
    "화이트보드가 너무 큽니다(1MB·요소 5,000개). 일부를 지우거나 새 보드로 나누세요.",
  WHITEBOARD_TEMPLATE_NOT_FOUND: "템플릿을 찾을 수 없습니다.",
  WHITEBOARD_REVISION_NOT_FOUND: "변경 이력을 찾을 수 없습니다.",
  WHITEBOARD_COMMENT_NOT_FOUND: "댓글이 이미 지워졌습니다.",
  PROJECT_FORBIDDEN: "이 프로젝트는 볼 수만 있습니다.",
  PROJECT_ARCHIVED: "아카이브된 프로젝트는 볼 수만 있습니다.",
  PROJECT_NOT_FOUND: "프로젝트가 없거나 볼 권한이 없습니다.",
  ONBOARDING_REQUIRED: "가입 승인과 Discord 연결을 완료한 뒤 이용해 주세요.",
};

export function whiteboardErrorMessage(error: unknown): string {
  const problem = normalizeApiError(error);
  return messages[problem.code] ?? problem.message;
}
