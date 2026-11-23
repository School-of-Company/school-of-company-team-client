import { WhiteboardEditorPage } from "@/pages/whiteboards/whiteboard-editor";

export default async function Page({
  params,
}: {
  readonly params: Promise<{ whiteboardId: string }>;
}) {
  const { whiteboardId } = await params;
  return <WhiteboardEditorPage whiteboardId={whiteboardId} />;
}
