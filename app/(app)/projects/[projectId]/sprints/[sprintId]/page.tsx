import { Suspense } from "react";
import { SprintDetailPage } from "@/pages/project-planning";
import Loading from "../../loading";

type Props = {
  readonly params: Promise<{ projectId: string; sprintId: string }>;
};

// 탭·계획 원천이 `useSearchParams`에 있어 Suspense 경계 안에서 그린다.
export default function Page(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <SprintRoute {...props} />
    </Suspense>
  );
}

async function SprintRoute({ params }: Props) {
  const { projectId, sprintId } = await params;
  return <SprintDetailPage projectId={projectId} sprintId={sprintId} />;
}
