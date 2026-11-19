import { Skeleton } from "@/shared/ui";

export function BoardSkeleton() {
  return (
    <div
      role="status"
      aria-label="보드를 불러오는 중"
      className="board-columns"
    >
      {Array.from({ length: 5 }, (_, column) => (
        <div
          key={column}
          className={`${column ? "hidden md:grid" : "grid"} content-start gap-3 border-t border-border p-2`}
        >
          <Skeleton className="mb-3 w-20" />
          {Array.from({ length: 3 }, (_, card) => (
            <Skeleton key={card} className="h-36 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
