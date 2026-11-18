import type { ComponentProps, ReactNode } from "react";
import Image from "next/image";
import { Button } from "./controls";

export function Badge({
  children,
  className = "",
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-sm bg-surface-hover px-2 py-1 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}
export function Avatar({
  name,
  src,
}: {
  readonly name: string;
  readonly src?: string;
}) {
  return src ? (
    <Image
      unoptimized
      width={36}
      height={36}
      src={src}
      alt={name}
      className="size-9 rounded-full object-cover"
      referrerPolicy="no-referrer"
    />
  ) : (
    <span
      role="img"
      aria-label={name}
      className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-hover text-sm font-semibold"
    >
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
    <section className="grid justify-items-center gap-3 px-6 py-16 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
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
