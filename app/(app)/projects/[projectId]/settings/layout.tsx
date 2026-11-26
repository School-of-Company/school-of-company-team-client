import {
  ProjectSettingsPage,
  ProjectSettingsSkeleton,
} from "@/pages/project-settings";
import { Suspense, type ReactNode } from "react";

type Props = {
  readonly params: Promise<{ projectId: string }>;
  readonly children: ReactNode;
};

export default function Layout({ params, children }: Props) {
  return (
    <>
      <Suspense fallback={<ProjectSettingsSkeleton />}>
        <SettingsRoute params={params} />
      </Suspense>
      {children}
    </>
  );
}

async function SettingsRoute({ params }: Pick<Props, "params">) {
  const { projectId } = await params;
  return <ProjectSettingsPage projectId={projectId} />;
}
