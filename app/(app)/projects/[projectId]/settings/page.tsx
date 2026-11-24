import {
  ProjectSettingsPage,
  ProjectSettingsSkeleton,
} from "@/pages/project-settings";
import { Suspense } from "react";

type Props = { readonly params: Promise<{ projectId: string }> };

export default function Page(props: Props) {
  return (
    <Suspense fallback={<ProjectSettingsSkeleton />}>
      <SettingsRoute {...props} />
    </Suspense>
  );
}

async function SettingsRoute({ params }: Props) {
  const { projectId } = await params;
  return <ProjectSettingsPage projectId={projectId} />;
}
