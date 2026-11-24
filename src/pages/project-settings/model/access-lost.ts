import { normalizeApiError } from "@/shared/api";

/**
 * 재조회가 403·404면 권한을 잃었거나 지워진 것이라 캐시된 설정을 더 보여 주지 않는다(오류 화면).
 * 5xx·네트워크 오류만 캐시를 두고 `StaleNotice`를 띄운다.
 */
export const isAccessLost = (error: unknown) =>
  error != null && [403, 404].includes(normalizeApiError(error).status);
