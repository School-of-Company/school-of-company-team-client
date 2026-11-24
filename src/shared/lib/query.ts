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

/**
 * 개수, 빈 상태처럼 "확정된 결과"로만 그려야 하는 값에 쓴다. 필터를 바꾼 직후의 placeholder(이전 키의 데이터)는 버린다.
 * 예: 부제 `운영 중 3개`를 아카이브 탭으로 바꾼 순간 `아카이브 3개`로 잘못 보이지 않게 한다.
 */
export const settledData = <T>(query: {
  readonly data: T | undefined;
  readonly isPlaceholderData: boolean;
}) => (query.isPlaceholderData ? undefined : query.data);

/**
 * 저장소 목록처럼 권한이 바뀌면 바로 달라져야 하는 목록. 화면을 떠나면 캐시를 버리고(다시 들어와도 옛 이름을 그리지 않는다),
 * 화면에 들어올 때와 창 포커스 때마다 다시 받는다.
 */
export const refetchOnVisit = {
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: "always",
  refetchOnWindowFocus: "always",
} as const;

export const HIDDEN_REPOSITORY = "비공개 저장소";

/** 서버가 이름을 숨긴(`accessible=false` 또는 빈 이름) 저장소는 이름 대신 "비공개 저장소"로 쓴다. */
export const repositoryName = (repository: {
  readonly fullName?: string | null;
  readonly accessible?: boolean;
}) =>
  repository.accessible === false || !repository.fullName
    ? HIDDEN_REPOSITORY
    : repository.fullName;
