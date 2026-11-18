"use client";
import { Suspense } from "react";
import { BoardWorkspace } from "@/widgets/kanban-board";
import { AuthGuard } from "@/features/auth";
import { TaskFilters } from "@/widgets/task-filters";
import { Spinner } from "@/shared/ui";
import type { BoardDetailComponent } from "@/widgets/kanban-board";
export function TeamBoardPage({
  Detail,
}: {
  readonly Detail?: BoardDetailComponent;
}) {
  return (
    <AuthGuard require="work">
      {(user) => (
        <Suspense fallback={<Spinner />}>
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
