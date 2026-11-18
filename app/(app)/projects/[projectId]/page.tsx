import { ProjectBoardPage } from "@/pages/project-board";
export default async function Page({
  params,
}: {
  readonly params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectBoardPage projectId={projectId} />;
}
