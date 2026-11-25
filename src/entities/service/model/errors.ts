import { normalizeApiError } from "@/shared/api";

const messages: Readonly<Record<string, string>> = {
  SERVICE_NOT_FOUND: "서비스가 없습니다. 목록을 새로고침하세요.",
  SERVICE_FORBIDDEN:
    "이 서비스의 소유자나 헤드 어드민만 변경할 수 있습니다. 최신 소유자를 확인하세요.",
  SERVICE_ARCHIVED:
    "아카이브된 서비스는 조회만 됩니다. 아카이브된 서비스를 의존 대상으로 고를 수도 없습니다.",
  SERVICE_ALREADY_ARCHIVED: "이미 아카이브된 서비스입니다.",
  SERVICE_NOT_ARCHIVED: "아카이브된 서비스가 아닙니다.",
  DUPLICATE_SERVICE_KEY:
    "같은 키의 서비스가 있습니다(아카이브 포함). 다른 키를 입력하세요.",
  SERVICE_KEY_IMMUTABLE: "서비스 키는 바꿀 수 없습니다.",
  SERVICE_OWNER_INVALID:
    "주 소유자는 정확히 한 명이어야 하고 중복할 수 없습니다.",
  SERVICE_OWNER_NOT_ACTIVE:
    "활성 사용자만 소유자로 지정할 수 있습니다. 이용이 중지된 소유자는 교체하세요.",
  SERVICE_REPOSITORY_ALREADY_LINKED:
    "이 저장소는 이미 다른 서비스에 연결되어 있습니다. 저장소 하나는 서비스 하나에만 연결됩니다.",
  SERVICE_REPOSITORY_NOT_FOUND:
    "이 서비스에 연결된 저장소가 아닙니다. 새로고침해 확인하세요.",
  SERVICE_DEPENDENCY_SELF: "자기 자신에게는 의존할 수 없습니다.",
  SERVICE_DEPENDENCY_EXISTS: "이미 같은 의존관계가 있습니다.",
  SERVICE_DEPENDENCY_NOT_FOUND:
    "이미 삭제된 의존관계입니다. 새로고침해 확인하세요.",
  RELEASE_NOT_FOUND:
    "릴리스를 찾을 수 없거나 볼 권한이 없습니다. 비공개 저장소 릴리스는 원본 저장소 권한이 있어야 보입니다.",
  ACCESS_DENIED: "헤드 어드민 권한이 필요합니다.",
  ONBOARDING_REQUIRED: "가입 승인과 Discord 연결을 완료한 뒤 이용해 주세요.",
  GITHUB_ACCOUNT_NOT_LINKED:
    "GitHub 계정 연결이 필요합니다. 설정의 연결 상태를 확인하세요.",
  GITHUB_NO_REPOSITORY_ACCESS:
    "현재 GitHub 계정에 이 저장소 권한이 없습니다. 저장소 관리자에게 권한을 요청하세요.",
  GITHUB_REPOSITORY_NOT_INSTALLED:
    "GitHub App 설치에서 허용한 저장소만 연결할 수 있습니다.",
  GITHUB_INSTALLATION_UNAVAILABLE:
    "GitHub App 설치가 중지되었거나 사용할 수 없습니다. 설치 관리자에게 확인하세요.",
  GITHUB_NOT_CONFIGURED:
    "GitHub App이 설정되지 않았습니다. 운영자에게 문의하세요.",
  GITHUB_UNAVAILABLE: "GitHub에 연결할 수 없습니다. 잠시 후 다시 시도하세요.",
  OPS_HEALTH_URL_INVALID:
    "헬스체크 주소를 확인하세요. https 주소만 되고, 사용자 정보와 기본 외 포트는 쓸 수 없습니다.",
  OPS_LINK_URL_INVALID: "링크는 http 또는 https 로 시작하는 주소여야 합니다.",
  OPS_RUNBOOK_INVALID: "Runbook 종류의 문서만 고를 수 있습니다.",
  OPS_HTTP_REQUIRES_LEAD: "http 허용은 헤드 어드민만 바꿀 수 있습니다.",
  OPS_HEALTH_CHECK_NOT_CONFIGURED: "헬스체크 주소를 먼저 설정해 주세요.",
  KNOWLEDGE_NOT_FOUND: "고른 Runbook을 찾을 수 없거나 읽을 권한이 없습니다.",
};

export function serviceErrorMessage(error: unknown): string {
  const problem = normalizeApiError(error);
  return messages[problem.code] ?? problem.message;
}
