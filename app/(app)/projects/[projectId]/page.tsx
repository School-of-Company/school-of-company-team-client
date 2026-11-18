import { BoardPage } from "./BoardPage";
export default async function Page({
  params,
}: {
  readonly params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <BoardPage projectId={projectId} />;
}
