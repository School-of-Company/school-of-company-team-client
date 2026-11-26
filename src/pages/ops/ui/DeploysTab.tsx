"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  serviceErrorMessage,
  serviceQueries,
  useServiceByKey,
} from "@/entities/service";
import {
  ServiceDeployments,
  ServiceReleases,
} from "@/widgets/service-delivery";
import { routes } from "@/shared/config";
import {
  ChipSelect,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageHeader,
  QueryState,
  SegmentedLinks,
} from "@/shared/ui";
import { OpsTabs } from "./OpsTabs";

/** 서비스 하나를 골라 배포 이력과 릴리스를 본다. 서비스는 `?service=키`, 보기는 `?view=releases`. */
export function DeploysTab() {
  const router = useRouter();
  const pathname = usePathname() ?? routes.ops;
  const search = useSearchParams();
  const services = useQuery(serviceQueries.list(false));
  const serviceKey = search?.get("service") ?? services.data?.[0]?.key ?? "";
  const view = search?.get("view") === "releases" ? "releases" : "deployments";
  const href = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(search?.toString());
    // 다른 서비스나 보기로 옮기면 환경 필터와 열린 릴리스 노트는 비운다.
    params.delete("env");
    params.delete("release");
    for (const [key, value] of Object.entries(next))
      if (value === null) params.delete(key);
      else params.set(key, value);
    return `${pathname}?${params.toString()}`;
  };
  return (
    <div className="grid gap-5">
      <PageHeader title="운영" subtitle="서비스별 배포와 릴리스" />
      <OpsTabs active="deploys" />
      <div className="page-toolbar">
        <SegmentedLinks
          label="배포 보기"
          items={[
            {
              href: href({ view: null }),
              label: "배포",
              active: view === "deployments",
            },
            {
              href: href({ view: "releases" }),
              label: "릴리스",
              active: view === "releases",
            },
          ]}
        />
        {services.data && services.data.length > 0 && (
          <ChipSelect
            label="서비스"
            value={serviceKey}
            options={services.data.map((service) => ({
              value: service.key,
              label: service.name,
            }))}
            onChange={(value) => router.replace(href({ service: value }))}
          />
        )}
      </div>
      <QueryState
        query={services}
        skeleton={<ListSkeleton label="서비스를 불러오는 중" />}
        errorMessage={serviceErrorMessage}
        empty={
          <EmptyState
            title="등록된 서비스가 없어요"
            description="서비스를 등록하고 저장소를 연결하면 배포와 릴리스가 여기에 쌓여요."
          />
        }
      >
        {() => (
          <ServiceDelivery
            key={serviceKey}
            serviceKey={serviceKey}
            view={view}
          />
        )}
      </QueryState>
    </div>
  );
}

function ServiceDelivery({
  serviceKey,
  view,
}: {
  readonly serviceKey: string;
  readonly view: "deployments" | "releases";
}) {
  const lookup = useServiceByKey(serviceKey);
  const detail = useQuery({
    ...serviceQueries.detail(lookup.id ?? ""),
    enabled: !!lookup.id,
  });
  if (lookup.notFound)
    return (
      <EmptyState
        title="서비스를 찾을 수 없어요"
        description="목록에서 서비스를 다시 고르세요."
      />
    );
  if (!detail.data && (lookup.error || detail.isError))
    return (
      <ErrorState
        description={serviceErrorMessage(lookup.error ?? detail.error)}
        onRetry={() => {
          lookup.refetch();
          void detail.refetch();
        }}
      />
    );
  if (!detail.data)
    return (
      <ListSkeleton label="배포를 불러오는 중" rows={2} rowClassName="h-12" />
    );
  return view === "releases" ? (
    <ServiceReleases service={detail.data} />
  ) : (
    <ServiceDeployments service={detail.data} />
  );
}
