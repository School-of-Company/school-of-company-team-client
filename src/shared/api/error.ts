import axios from "axios";

export type ErrorResponse = {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** 서버 `ErrorResponse.details`(예: `{ limit }`, `{ retryAfterSeconds }`). */
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError<unknown>(error)) {
    const data = error.response?.data;
    const status = error.response?.status ?? 0;
    if (
      typeof data === "object" &&
      data !== null &&
      "code" in data &&
      typeof data.code === "string" &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return new ApiError(
        status,
        data.code,
        data.message,
        "details" in data ? data.details : undefined,
      );
    }
    return new ApiError(
      status,
      error.code ?? "REQUEST_FAILED",
      status
        ? "요청을 처리하지 못했습니다."
        : "서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.",
    );
  }
  return new ApiError(0, "UNKNOWN", "알 수 없는 오류가 발생했습니다.");
}

/**
 * 서버 `VALIDATION_ERROR` 의 details(필드 이름 → 메시지)에서 폼이 가진 필드만 골라 낸다.
 * 고를 것이 없으면 `{ form: fallback }` 을 돌려 폼 전체 오류로 보여 준다.
 */
export function fieldErrors(
  error: Pick<ApiError, "code" | "details">,
  fields: readonly string[],
  fallback: string,
): Record<string, string> {
  if (
    error.code === "VALIDATION_ERROR" &&
    typeof error.details === "object" &&
    error.details !== null
  ) {
    const picked = Object.fromEntries(
      Object.entries(error.details).filter(
        (entry): entry is [string, string] =>
          fields.includes(entry[0]) && typeof entry[1] === "string",
      ),
    );
    if (Object.keys(picked).length) return picked;
  }
  return { form: fallback };
}
