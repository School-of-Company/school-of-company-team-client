"use client";

import { ErrorState } from "@/shared/ui";

export function RouteError({
  retry,
}: {
  readonly error: unknown;
  readonly retry: () => void;
}) {
  return <ErrorState onRetry={retry} />;
}
