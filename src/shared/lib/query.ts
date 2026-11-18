import { hashKey, type QueryKey } from "@tanstack/react-query";

/**
 * `keepPreviousData`와 같되 **키가 바뀔 때만**(필터 전환 등) 이전 데이터를 빌려 온다.
 * 같은 키의 캐시가 지워진 뒤(업무가 사라져 정리됨)에는 지운 데이터를 다시 그리지 않는다.
 */
export const keepPreviousKey =
  (queryKey: QueryKey) =>
  <T>(
    previous: T | undefined,
    previousQuery?: { readonly queryHash: string },
  ) =>
    previousQuery && previousQuery.queryHash !== hashKey(queryKey)
      ? previous
      : undefined;
