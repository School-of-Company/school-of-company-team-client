import { Skeleton, Spinner } from "@/shared/ui";

export function RouteLoading() {
  return (
    <div className="grid gap-6 p-4">
      <Spinner />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40" />
    </div>
  );
}
