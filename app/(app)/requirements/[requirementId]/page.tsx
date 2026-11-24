import { RequirementDetailPage } from "@/pages/intake/requirements";

export default async function Page({
  params,
}: {
  readonly params: Promise<{ requirementId: string }>;
}) {
  const { requirementId } = await params;
  return <RequirementDetailPage requirementId={requirementId} />;
}
