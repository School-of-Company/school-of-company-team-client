"use client";
import { Suspense } from "react";
import { BoardPageSkeleton, BoardWorkspace } from "@/widgets/kanban-board";
import { AuthGuard } from "@/features/auth";
import { TaskFilters } from "@/widgets/task-filters";
import type { BoardDetailComponent } from "@/widgets/kanban-board";
export function TeamBoardPage({
  Detail,
}: {
  readonly Detail?: BoardDetailComponent;
}) {
  return (
    <AuthGuard require="work" fallback={<BoardPageSkeleton scope="TEAM" />}>
      {(user) => (
        <Suspense fallback={<BoardPageSkeleton scope="TEAM" />}>
          <BoardWorkspace
            scope="TEAM"
            Detail={Detail}
            user={user}
            renderFilters={(props) => <TaskFilters {...props} />}
          />
        </Suspense>
      )}
    </AuthGuard>
  );
}
