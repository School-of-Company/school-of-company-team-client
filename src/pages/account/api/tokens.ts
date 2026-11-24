import type { QueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api";
import type {
  ApiToken,
  CreateApiToken,
  CreatedApiToken,
} from "../model/api-token";

export const apiTokensQueryKey = ["me", "tokens"] as const;

export async function listApiTokens() {
  const { data } = await api.get<ApiToken[]>("/api/v1/me/tokens");
  return data;
}

/** 응답의 `token` 은 이때 한 번만 온다. 호출부는 대화상자 상태에만 두고 캐시·저장소에 넣지 않는다. */
export async function createApiToken(body: CreateApiToken) {
  const { data } = await api.post<CreatedApiToken>("/api/v1/me/tokens", body);
  return data;
}

export async function revokeApiToken(id: string) {
  await api.delete(`/api/v1/me/tokens/${encodeURIComponent(id)}`);
}

/**
 * 만들기 흐름. useMutation 을 쓰지 않는다: mutation 결과(state.data)와 cache 이벤트에 평문 토큰이 실린다.
 * 토큰은 `deliver` 로만 넘기고(대화상자 로컬 상태), 반환값과 캐시에는 남기지 않는다.
 */
export async function createTokenForDialog(
  client: QueryClient,
  body: CreateApiToken,
  deliver: (token: CreatedApiToken) => void,
  create: (body: CreateApiToken) => Promise<CreatedApiToken> = createApiToken,
): Promise<void> {
  deliver(await create(body));
  void client.invalidateQueries({ queryKey: apiTokensQueryKey });
}
