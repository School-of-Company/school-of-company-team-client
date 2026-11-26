import { normalizeApiError } from "@/shared/api";

export function githubErrorMessage(error: unknown): string {
  const normalized = normalizeApiError(error);
  switch (normalized.code) {
    case "GITHUB_NOT_CONFIGURED":
      return "관리자가 GitHub App 설정을 완료해야 해요. 로그인 연결과 별개이며, 설정 전에는 저장소를 연결할 수 없어요.";
    case "GITHUB_ACCOUNT_NOT_LINKED":
      return "GitHub 계정 연결이 필요해요. 설정의 연결 상태를 확인하고 GitHub로 다시 로그인하세요.";
    case "GITHUB_NO_REPOSITORY_ACCESS":
      return "현재 GitHub 계정에 원본 저장소 접근 권한이 없어요. 저장소 관리자에게 권한을 요청한 뒤 다시 시도하세요.";
    case "GITHUB_REPOSITORY_NOT_INSTALLED":
      return "GitHub App에 이 저장소가 허용되지 않았어요. 설치 관리자에게 저장소 접근 허용을 요청하고 목록을 다시 불러오세요.";
    case "GITHUB_INSTALLATION_UNAVAILABLE":
      return "GitHub App 설치가 중지되었거나 사용할 수 없어요. 설치 관리자에게 확인을 요청하세요.";
    case "GITHUB_REPOSITORY_ALREADY_LINKED":
      return "이미 연결된 저장소예요. 목록을 새로고침해 확인하세요.";
    case "GITHUB_REPOSITORY_IN_USE":
      return "발행에 사용된 저장소는 연결을 해제할 수 없어요. 기존 발행 기록을 확인하세요.";
    case "GITHUB_REPOSITORY_NOT_FOUND":
      return "저장소 연결을 찾을 수 없어요. 목록을 다시 불러오세요.";
    case "GITHUB_UNAVAILABLE":
      return "GitHub에 연결할 수 없어요. 잠시 후 다시 시도하세요.";
    default:
      return normalized.message;
  }
}

/** 일괄 연결 결과 한 줄에 들어갈 짧은 실패 사유. */
export function githubLinkFailureReason(error: unknown): string {
  const normalized = normalizeApiError(error);
  switch (normalized.code) {
    case "GITHUB_NOT_CONFIGURED":
      return "GitHub App 설정 필요";
    case "GITHUB_ACCOUNT_NOT_LINKED":
      return "GitHub 계정 연결 필요";
    case "GITHUB_NO_REPOSITORY_ACCESS":
      return "원본 저장소 접근 권한 없음";
    case "GITHUB_REPOSITORY_NOT_INSTALLED":
      return "GitHub App에 허용되지 않은 저장소";
    case "GITHUB_INSTALLATION_UNAVAILABLE":
      return "GitHub App 설치를 사용할 수 없음";
    case "GITHUB_REPOSITORY_ALREADY_LINKED":
      return "이미 연결된 저장소";
    case "GITHUB_UNAVAILABLE":
      return "GitHub 연결 실패, 잠시 후 다시 시도";
    default:
      return normalized.message;
  }
}
