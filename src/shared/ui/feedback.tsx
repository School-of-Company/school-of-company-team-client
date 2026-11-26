"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import Image from "next/image";
import { Button } from "./controls";
import { StaleNotice } from "./stale-notice";

export function Badge({
  children,
  className = "",
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <span className={`ui-badge ${className}`}>{children}</span>;
}
export function Avatar({
  name,
  src,
  size = "sm",
}: {
  readonly name: string;
  readonly src?: string;
  readonly size?: "sm" | "lg";
}) {
  const className = `ui-avatar ${size === "lg" ? "ui-avatar-lg" : ""}`;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const pixels = size === "lg" ? 56 : 22;
  return src && src !== failedSource ? (
    <Image
      unoptimized
      width={pixels}
      height={pixels}
      src={src}
      alt={name}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setFailedSource(src)}
    />
  ) : (
    <span role="img" aria-label={name} className={className}>
      {name.slice(0, 1)}
    </span>
  );
}
export function Spinner({
  label = "불러오는 중",
}: {
  readonly label?: string;
}) {
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 text-sm text-muted"
    >
      <span aria-hidden="true" className="ui-spinner" />
      {label}
    </span>
  );
}
export function Skeleton({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      {...props}
      className={`min-h-5 rounded-sm bg-surface-hover motion-safe:animate-pulse ${className}`}
    />
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}) {
  return (
    <section className="ui-empty">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </section>
  );
}
/** 첫 로딩 목록 자리. 빈 상태와 같은 높이부터 시작하고, 행 높이는 실제 행에 맞춘다. */
export function ListSkeleton({
  label = "불러오는 중",
  rows = 4,
  rowClassName = "h-12",
}: {
  readonly label?: string;
  readonly rows?: number;
  readonly rowClassName?: string;
}) {
  return (
    <div role="status" aria-label={label} className="ui-skeleton-list">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className={rowClassName} />
      ))}
    </div>
  );
}

type QueryLike<T> = {
  readonly data: T | undefined;
  readonly error: unknown;
  readonly isError: boolean;
  readonly isPending: boolean;
  readonly isFetching: boolean;
  readonly isPlaceholderData: boolean;
  readonly refetch: () => unknown;
};

/**
 * 목록 조회의 네 상태(첫 로딩, 실패, 빈 결과, 결과)를 한 방식으로 그린다.
 * - 캐시가 있으면 스켈레톤 없이 바로 그린다. 첫 로딩만 `skeleton`.
 * - 필터나 탭을 바꿔 이전 결과(placeholder)를 보여 주는 동안에는 흐리게만 하고, 빈 결과면 문구 없는 같은 크기 박스를 둔다.
 *   placeholder로 빈 상태 문구나 개수를 보여 주지 않는다.
 * - 재조회 중에는 `aria-busy`. 감싸는 요소는 `display: contents`라 호출한 쪽의 grid/flex 배치를 그대로 쓴다.
 * - 캐시가 있는데 재조회가 실패하면 캐시를 그대로 두고 위에 `StaleNotice`(다시 시도)를 띄운다. 첫 로딩 실패만 오류 화면.
 */
export function QueryState<T>({
  query,
  empty,
  isEmpty = (data) => Array.isArray(data) && data.length === 0,
  skeleton = <ListSkeleton />,
  errorMessage,
  error,
  children,
}: {
  readonly query: QueryLike<T>;
  readonly empty: ReactNode;
  readonly isEmpty?: (data: T) => boolean;
  readonly skeleton?: ReactNode;
  readonly errorMessage?: (error: unknown) => string;
  /** 오류 화면 자체를 바꿀 때(코드별 제목 등). 없으면 `ErrorState` + `errorMessage`. */
  readonly error?: (error: unknown, retry: () => void) => ReactNode;
  readonly children: (data: T) => ReactNode;
}) {
  if (query.data === undefined)
    return query.isPending ? (
      skeleton
    ) : error ? (
      error(query.error, () => void query.refetch())
    ) : (
      <ErrorState
        description={errorMessage?.(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  if (isEmpty(query.data) && query.isPlaceholderData)
    return <div role="status" aria-label="불러오는 중" className="ui-empty" />;
  return (
    <div
      className="query-region"
      aria-busy={query.isFetching || undefined}
      data-placeholder={query.isPlaceholderData || undefined}
    >
      <StaleNotice query={query} />
      {isEmpty(query.data) ? empty : children(query.data)}
    </div>
  );
}

export function ErrorState({
  title = "불러오지 못했어요",
  description = "잠시 후 다시 시도해 주세요.",
  onRetry,
}: {
  readonly title?: string;
  readonly description?: string;
  readonly onRetry?: () => void;
}) {
  return (
    <div role="alert">
      <EmptyState
        title={title}
        description={description}
        action={
          onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              다시 시도
            </Button>
          )
        }
      />
    </div>
  );
}
