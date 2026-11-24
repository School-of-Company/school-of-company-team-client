import { IntakeFormPage } from "@/pages/intake/public";

export default async function Page({
  params,
}: {
  readonly params: Promise<{ formToken: string }>;
}) {
  const { formToken } = await params;
  return <IntakeFormPage formToken={formToken} />;
}
