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
      return new ApiError(status, data.code, data.message);
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
