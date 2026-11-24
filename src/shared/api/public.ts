import axios from "axios";
import { normalizeApiError } from "./error";

/**
 * 계정 없는 외부 요청자용(`/api/v1/public/**`). 로그인 토큰을 붙이지 않고, 401 갱신·로그인 이동 같은
 * 세션 처리도 하지 않는다(공용 `api` 의 인터셉터와 분리).
 */
export const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15_000,
});

publicApi.interceptors.response.use(undefined, (error: unknown) =>
  Promise.reject(normalizeApiError(error)),
);
