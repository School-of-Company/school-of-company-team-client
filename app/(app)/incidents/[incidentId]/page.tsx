import { IncidentDetailPage } from "@/pages/incident-detail";
export default async function Page({
  params,
}: {
  readonly params: Promise<{ incidentId: string }>;
}) {
  const { incidentId } = await params;
  return <IncidentDetailPage incidentId={incidentId} />;
}
