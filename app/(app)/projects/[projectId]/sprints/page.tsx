import { SprintListPage } from "@/pages/project-planning";

export default async function Page({
  params,
}: {
  readonly params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <SprintListPage projectId={projectId} />;
}
