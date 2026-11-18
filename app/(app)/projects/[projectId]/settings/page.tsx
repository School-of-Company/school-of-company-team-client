import { ProjectSettingsPage } from "@/pages/project-settings";
import { Spinner } from "@/shared/ui";
import { Suspense } from "react";

type Props = { readonly params: Promise<{ projectId: string }> };

export default function Page(props: Props) {
  return (
    <Suspense fallback={<Spinner label="프로젝트 설정 불러오는 중" />}>
      <SettingsRoute {...props} />
    </Suspense>
  );
}

async function SettingsRoute({ params }: Props) {
  const { projectId } = await params;
  return <ProjectSettingsPage projectId={projectId} />;
}
