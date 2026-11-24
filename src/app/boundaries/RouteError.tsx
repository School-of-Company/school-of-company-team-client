"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ErrorState } from "@/shared/ui";

export function RouteError({
  retry,
}: {
  readonly error: unknown;
  readonly retry: () => void;
}) {
  const client = useQueryClient();
  return (
    <ErrorState
      onRetry={() => {
        // 받은 데이터 때문에 그리다 실패했으면 캐시가 그대로인 한 다시 그려도 같은 오류다.
        // 캐시를 비워 화면에 있는 조회를 처음부터 다시 받은 뒤 다시 그린다.
        void client.resetQueries();
        retry();
      }}
    />
  );
}
