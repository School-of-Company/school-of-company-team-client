import { KnowledgeDetailPage } from "@/pages/knowledge-detail";
export default async function Page({
  params,
}: {
  readonly params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  return <KnowledgeDetailPage documentId={documentId} />;
}
