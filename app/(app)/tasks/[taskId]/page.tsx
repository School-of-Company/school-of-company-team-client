import { TaskDetailPage } from "@/pages/task-detail";
export default async function Page({
  params,
}: {
  readonly params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  return <TaskDetailPage taskId={taskId} />;
}
