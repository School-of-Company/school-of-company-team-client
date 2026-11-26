import { isAxiosError } from "axios";
import { OAuthCallbackError } from "../api/oauth";

export function authErrorCode(error: unknown): string | undefined {
  if (error instanceof OAuthCallbackError) return error.code;
  if (isAxiosError(error)) {
    const data: unknown = error.response?.data;
    if (
      typeof data === "object" &&
      data !== null &&
      "code" in data &&
      typeof data.code === "string"
    ) {
      return data.code;
    }
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
}

export function authErrorMessage(error: unknown): string {
  switch (authErrorCode(error)) {
    case "OAUTH_CANCELLED":
      return "인증을 취소했어요. 다시 연결해 주세요.";
    case "OAUTH_STATE_INVALID":
      return "인증 요청이 만료되었거나 이 브라우저에서 시작하지 않았어요. 처음부터 다시 시작해 주세요.";
    case "OAUTH_CODE_INVALID":
      return "인증 코드가 만료됐어요. 처음부터 다시 시작해 주세요.";
    case "OAUTH_PROVIDER_ERROR":
      return "인증 서비스에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
    case "OAUTH_NOT_CONFIGURED":
      return "인증 서비스 설정이 준비되지 않았어요. 관리자에게 문의해 주세요.";
    case "DISCORD_ACCOUNT_IN_USE":
      return "다른 사용자에게 연결된 Discord 계정이에요. 다른 계정으로 다시 시도해 주세요.";
    case "DISCORD_ALREADY_LINKED":
      return "이미 Discord 계정이 연결되어 있어요. 설정에서 연결 상태를 확인해 주세요.";
    case "REJECTED":
      return "가입 승인이 거절됐어요. 관리자에게 문의해 주세요.";
    case "SUSPENDED":
      return "이용이 중지됐어요. 관리자에게 문의해 주세요.";
    case "PENDING_APPROVAL":
      return "관리자의 가입 승인을 기다리고 있어요.";
    case "ONBOARDING_REQUIRED":
      return "가입 승인과 Discord 연결을 완료해 주세요.";
    case "ACCESS_DENIED":
      return "이 작업을 수행할 권한이 없어요.";
    default:
      return "요청을 처리하지 못했어요. 연결을 확인하고 다시 시도해 주세요.";
  }
}
