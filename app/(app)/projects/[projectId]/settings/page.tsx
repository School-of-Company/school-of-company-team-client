import { ProjectSettingsPage } from "@/pages/project-settings";

export default async function Page({
  params,
}: {
  readonly params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectSettingsPage projectId={projectId} />;
}
