import { Skeleton } from "@/shared/ui";
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="프로젝트 화면 불러오는 중"
      aria-busy="true"
      className="grid gap-3"
    >
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-9 w-64 max-w-full" />
    </div>
  );
}
