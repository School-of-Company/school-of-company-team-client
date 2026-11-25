"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { isHeadAdmin } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { PageSkeleton } from "@/shared/ui";
import { DeploysTab } from "./DeploysTab";
import { opsTabs, type OpsTab } from "./OpsTabs";
import { IncidentsTab } from "./IncidentsTab";
import { ServicesTab } from "./ServicesTab";
import { StatusTab } from "./StatusTab";

export function OpsPage() {
  return (
    <AuthGuard require="work">
      {(user) => (
        <Suspense fallback={<PageSkeleton label="운영 불러오는 중" />}>
          <OpsContent headAdmin={isHeadAdmin(user)} />
        </Suspense>
      )}
    </AuthGuard>
  );
}

function OpsContent({ headAdmin }: { readonly headAdmin: boolean }) {
  const search = useSearchParams();
  const tab: OpsTab =
    opsTabs.find((item) => item.value === search?.get("tab"))?.value ??
    "status";
  switch (tab) {
    case "incidents":
      return <IncidentsTab />;
    case "services":
      return <ServicesTab canCreate={headAdmin} />;
    case "deploys":
      return <DeploysTab />;
    default:
      return <StatusTab />;
  }
}
