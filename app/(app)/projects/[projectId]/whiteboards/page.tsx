import { WhiteboardListPage } from "@/pages/whiteboards/whiteboard-list";

export default async function Page({
  params,
}: {
  readonly params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <WhiteboardListPage projectId={projectId} />;
}
