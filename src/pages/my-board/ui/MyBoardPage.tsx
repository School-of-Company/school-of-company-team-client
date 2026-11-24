"use client";
import { Suspense } from "react";
import { BoardPageSkeleton, BoardWorkspace } from "@/widgets/kanban-board";
import { AuthGuard } from "@/features/auth";
import { TaskFilters } from "@/widgets/task-filters";
import type { BoardDetailComponent } from "@/widgets/kanban-board";
export function MyBoardPage({
  Detail,
}: {
  readonly Detail?: BoardDetailComponent;
}) {
  return (
    <AuthGuard require="work" fallback={<BoardPageSkeleton scope="PERSONAL" />}>
      {(user) => (
        <Suspense fallback={<BoardPageSkeleton scope="PERSONAL" />}>
          <BoardWorkspace
            scope="PERSONAL"
            Detail={Detail}
            user={user}
            renderFilters={(props) => <TaskFilters {...props} />}
          />
        </Suspense>
      )}
    </AuthGuard>
  );
}
