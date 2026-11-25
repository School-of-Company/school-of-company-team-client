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
    "이미지, 파일, 웹 임베드는 넣을 수 없습니다. 지운 뒤 다시 저장됩니다.",
  WHITEBOARD_LINK_NOT_ALLOWED:
    "링크는 http(s) 주소나 /로 시작하는 경로만 쓸 수 있습니다.",
  WHITEBOARD_TOO_LARGE:
    "화이트보드가 너무 큽니다(1MB, 요소 5,000개). 일부를 지우거나 새 보드로 나누세요.",
  WHITEBOARD_TEMPLATE_NOT_FOUND:
    "템플릿이 지워졌습니다. 목록을 새로 불러와 다시 고르세요.",
  WHITEBOARD_TEMPLATE_SOURCE_PRIVATE:
    "참여자 공개 프로젝트의 화이트보드는 팀 템플릿으로 저장할 수 없습니다.",
  WHITEBOARD_TEMPLATE_LIMIT:
    "팀 템플릿은 50개까지입니다. 쓰지 않는 템플릿을 지운 뒤 다시 저장하세요.",
  // ponytail: 서버 리뷰에서 팀 템플릿 scene 을 300KB 로 막기로 했다. 코드 이름은 s16 반영 뒤 맞춘다.
  WHITEBOARD_TEMPLATE_TOO_LARGE:
    "팀 템플릿은 300KB까지입니다. 보드를 나누거나 요소를 줄인 뒤 다시 저장하세요.",
  WHITEBOARD_LINK_NOT_FOUND: "연결이 이미 지워졌습니다.",
  WHITEBOARD_LINK_DUPLICATE: "이미 연결된 대상입니다.",
  WHITEBOARD_LINK_LIMIT:
    "화이트보드 하나에 업무와 문서를 합쳐 50개까지 연결할 수 있습니다.",
  TASK_NOT_FOUND: "업무가 없거나 볼 권한이 없습니다.",
  KNOWLEDGE_NOT_FOUND: "문서가 없거나 볼 권한이 없습니다.",
  ACCESS_DENIED: "헤드 어드민만 팀 템플릿을 관리할 수 있습니다.",
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
