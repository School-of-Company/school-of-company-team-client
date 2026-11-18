"use client";
import { Suspense } from "react";
import { BoardWorkspace } from "@/widgets/kanban-board";
import { AuthGuard } from "@/features/auth";
import { TaskFilters } from "@/widgets/task-filters";
import { Spinner } from "@/shared/ui";
export function TeamBoardPage() {
  return (
    <AuthGuard require="work">
      {(user) => (
        <Suspense fallback={<Spinner />}>
          <BoardWorkspace
            scope="TEAM"
            user={user}
            renderFilters={(props) => <TaskFilters {...props} />}
          />
        </Suspense>
      )}
    </AuthGuard>
  );
}
