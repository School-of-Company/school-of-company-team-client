import { ProjectDocumentsPage } from "@/pages/knowledge-list";

export default async function Page({
  params,
}: {
  readonly params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectDocumentsPage projectId={projectId} />;
}
