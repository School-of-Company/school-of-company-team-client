"use client";

import { Button } from "./controls";

/** 재조회가 실패하면 마지막으로 받은 내용을 그대로 두고 이 안내만 띄운다(첫 로딩 실패만 오류 화면). */
export function StaleNotice({
  query,
}: {
  readonly query: {
    readonly isError: boolean;
    readonly isFetching: boolean;
    readonly data: unknown;
    readonly refetch: () => unknown;
  };
}) {
  if (!query.isError || query.data === undefined) return null;
  return (
    <div
      role="status"
      className="ui-notice flex flex-wrap items-center justify-between gap-2 text-sm"
    >
      <span>최신 정보를 불러오지 못해 마지막으로 받은 내용을 보여 줘요.</span>
      <Button
        variant="ghost"
        className="ui-button-sm"
        loading={query.isFetching}
        onClick={() => void query.refetch()}
      >
        다시 시도
      </Button>
    </div>
  );
}
