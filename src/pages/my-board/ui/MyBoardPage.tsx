"use client";
import { Suspense } from "react";
import { BoardWorkspace } from "@/widgets/kanban-board";
import { AuthGuard } from "@/features/auth";
import { ReviewRequests } from "./ReviewRequests";
import { TaskFilters } from "@/widgets/task-filters";
import { Spinner } from "@/shared/ui";
import type { BoardDetailComponent } from "@/widgets/kanban-board";
export function MyBoardPage({
  Detail,
}: {
  readonly Detail?: BoardDetailComponent;
}) {
  return (
    <AuthGuard require="work">
      {(user) => (
        <Suspense fallback={<Spinner />}>
          <BoardWorkspace
            scope="PERSONAL"
            Detail={Detail}
            user={user}
            renderFilters={(props) => <TaskFilters {...props} />}
            aside={<ReviewRequests githubLinked={!!user.githubLogin} />}
          />
        </Suspense>
      )}
    </AuthGuard>
  );
}
