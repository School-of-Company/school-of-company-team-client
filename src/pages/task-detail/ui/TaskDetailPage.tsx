"use client";
import { TaskDetailWorkspace } from "./TaskDetailWorkspace";
import { TaskDetailSkeleton } from "./TaskDetailSkeleton";
import { AuthGuard } from "@/features/auth";
export function TaskDetailPage({ taskId }: { readonly taskId: string }) {
  return (
    <AuthGuard require="work" fallback={<TaskDetailSkeleton />}>
      {(user) => (
        <TaskDetailWorkspace key={taskId} taskId={taskId} user={user} />
      )}
    </AuthGuard>
  );
}
