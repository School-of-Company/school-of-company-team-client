"use client";
import { Suspense } from "react";
import { BoardWorkspace } from "@/widgets/kanban-board";
import { AuthGuard } from "@/features/auth";
import { TaskFilters } from "@/widgets/task-filters";
import { Spinner } from "@/shared/ui";
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
    <AuthGuard require="work">
      {(user) => (
        <Suspense fallback={<Spinner />}>
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
