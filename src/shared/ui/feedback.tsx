"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import Image from "next/image";
import { Button } from "./controls";

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
      {description && (
        <p className="max-w-md text-sm text-muted">{description}</p>
      )}
      {action}
    </section>
  );
}
export function ErrorState({
  title = "불러오지 못했습니다",
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
