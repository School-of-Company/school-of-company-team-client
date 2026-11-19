"use client";

import { useEffect, useState } from "react";
import { normalizeApiError } from "@/shared/api";

/** 서버 원본 권한 캐시 상한과 같다. 마지막 성공 후 이보다 오래된 목록은 보여 주지 않는다. */
export const LAST_DATA_LIMIT = 60_000;

/**
 * 재조회가 실패한 뒤에도 마지막 목록을 보여 줄지 정한다.
 * 일시 장애(네트워크·5xx)이고 마지막 성공 후 60초 안일 때만 유지한다.
 * 401·403·404 같은 응답은 권한·존재가 바뀐 것이라 바로 버린다(fail closed).
 */
export function keepsLastData(
  error: unknown,
  dataUpdatedAt: number,
  checkedAt: number,
) {
  const { status } = normalizeApiError(error);
  const transient = status === 0 || status >= 500;
  return transient && checkedAt - dataUpdatedAt < LAST_DATA_LIMIT;
}

type QueryState<T> = {
  readonly data: T | undefined;
  readonly error: unknown;
  readonly isError: boolean;
  readonly dataUpdatedAt: number;
  readonly errorUpdatedAt: number;
};

/**
 * 폴링 목록이 화면에 보여 줄 데이터. 성공 중이면 그대로, 실패 중이면 `keepsLastData` 규칙을 따른다.
 * `stale`이면 마지막 목록과 함께 비차단 안내를 보여 준다. 60초가 되는 순간 다시 그려 목록을 비운다.
 */
export function useLastData<T>(query: QueryState<T>) {
  const [expired, setExpired] = useState(0);
  const { isError, dataUpdatedAt } = query;
  useEffect(() => {
    if (!isError || !dataUpdatedAt) return;
    const timer = setTimeout(
      () => setExpired(dataUpdatedAt),
      Math.max(0, dataUpdatedAt + LAST_DATA_LIMIT - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [isError, dataUpdatedAt]);
  if (!isError) return { data: query.data, stale: false };
  const keep =
    expired !== dataUpdatedAt &&
    keepsLastData(query.error, dataUpdatedAt, query.errorUpdatedAt);
  return {
    data: keep ? query.data : undefined,
    stale: keep && query.data !== undefined,
  };
}
