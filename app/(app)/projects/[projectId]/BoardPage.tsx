"use client";
import { ProjectBoardPage } from "@/pages/project-board";
import { TaskDetailWorkspace } from "@/pages/task-detail";
export function BoardPage({ projectId }: { readonly projectId: string }) {
  return (
    <ProjectBoardPage projectId={projectId} Detail={TaskDetailWorkspace} />
  );
}
