import { ServiceDetailPage } from "@/pages/service-detail";
export default async function Page({
  params,
}: {
  readonly params: Promise<{ serviceKey: string }>;
}) {
  const { serviceKey } = await params;
  return <ServiceDetailPage serviceKey={serviceKey} />;
}
