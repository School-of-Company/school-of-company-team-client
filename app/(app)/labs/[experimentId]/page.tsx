import { LabDetailPage } from "@/pages/labs/lab-detail";
export default async function Page({
  params,
}: {
  readonly params: Promise<{ experimentId: string }>;
}) {
  const { experimentId } = await params;
  return <LabDetailPage experimentId={experimentId} />;
}
