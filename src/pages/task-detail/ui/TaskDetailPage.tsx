"use client";
import { TaskDetailWorkspace } from "./TaskDetailWorkspace";
import { AuthGuard } from "@/features/auth";
export function TaskDetailPage({ taskId }: { readonly taskId: string }) {
  return (
    <AuthGuard require="work">
      {(user) => (
        <TaskDetailWorkspace key={taskId} taskId={taskId} user={user} />
      )}
    </AuthGuard>
  );
}
