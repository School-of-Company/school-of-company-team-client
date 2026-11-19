import { Suspense } from "react";
import { MilestoneListPage } from "@/pages/project-planning";
import Loading from "../loading";

type Props = { readonly params: Promise<{ projectId: string }> };

// 열린 패널(`?milestone=`)이 `useSearchParams`에 있어 Suspense 경계 안에서 그린다.
export default function Page(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <MilestoneRoute {...props} />
    </Suspense>
  );
}

async function MilestoneRoute({ params }: Props) {
  const { projectId } = await params;
  return <MilestoneListPage projectId={projectId} />;
}
