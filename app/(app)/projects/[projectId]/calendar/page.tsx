import { CalendarPage } from "@/pages/calendar/calendar-view";

export default async function Page({
  params,
}: {
  readonly params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <CalendarPage projectId={projectId} />;
}
