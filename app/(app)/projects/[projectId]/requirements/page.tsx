import { ProjectRequirementsPage } from "@/pages/intake/requirements";

export default async function Page({
  params,
}: {
  readonly params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectRequirementsPage projectId={projectId} />;
}
