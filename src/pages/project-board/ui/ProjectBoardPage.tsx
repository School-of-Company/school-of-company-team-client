"use client";
import { Suspense } from "react";
import { BoardPageSkeleton, BoardWorkspace } from "@/widgets/kanban-board";
import { AuthGuard } from "@/features/auth";
import { TaskFilters } from "@/widgets/task-filters";
import type { BoardDetailComponent } from "@/widgets/kanban-board";
import { ProjectNav } from "@/widgets/project-nav";
export function ProjectBoardPage({
  projectId,
  Detail,
}: {
  readonly projectId: string;
  readonly Detail?: BoardDetailComponent;
}) {
  return (
    <AuthGuard require="work" fallback={<BoardPageSkeleton scope="PROJECT" />}>
      {(user) => (
        <Suspense fallback={<BoardPageSkeleton scope="PROJECT" />}>
          <BoardWorkspace
            scope="PROJECT"
            Detail={Detail}
            projectId={projectId}
            user={user}
            renderProjectNav={(project) => (
              <ProjectNav project={project} user={user} />
            )}
            renderFilters={(props) => <TaskFilters {...props} />}
          />
        </Suspense>
      )}
    </AuthGuard>
  );
}
