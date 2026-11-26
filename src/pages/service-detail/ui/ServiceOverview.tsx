"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  OwnerList,
  serviceQueries,
  tierDescriptions,
  TierLabel,
  type ServiceDetail,
} from "@/entities/service";
import {
  OwnersDialog,
  ServiceDependencies,
  ServiceRepositories,
} from "@/features/manage-service";
import { DependencyGraph } from "@/widgets/dependency-graph";
import { neighbourGraph } from "../model/neighbour-graph";
import { Button } from "@/shared/ui";
import { formatDate } from "@/shared/lib";
import {
  DeploymentEntry,
  DeploymentsState,
  ReleaseRow,
  ReleasesState,
} from "@/widgets/service-delivery";
import { routes } from "@/shared/config";

export function ServiceOverview({
  service,
}: {
  readonly service: ServiceDetail;
}) {
  const [owners, setOwners] = useState(false);
  return (
    <div className="task-detail">
      <div className="task-detail-grid">
        <div className="task-main">
          <section aria-label="설명">
            {service.description ? (
              <p className="text-md wrap-anywhere whitespace-pre-wrap">
                {service.description}
              </p>
            ) : (
              <p className="text-sm text-muted">설명이 없습니다.</p>
            )}
          </section>
          <ServiceRepositories service={service} />
          <ServiceDependencies service={service} />
          <NeighbourGraph service={service} />
          <RecentReleases service={service} />
          <RecentDeployments service={service} />
        </div>
        <aside className="task-props" aria-label="서비스 속성">
          <dl>
            <div>
              <dt>등급</dt>
              <dd>
                <TierLabel tier={service.tier} />
                <span className="text-xs text-muted">
                  {tierDescriptions[service.tier]}
                </span>
              </dd>
            </div>
            <div className="service-prop-owners">
              <dt>소유자</dt>
              <dd>
                <OwnerList owners={service.owners} />
                {service.canEdit && (
                  <Button
                    variant="ghost"
                    className="ui-button-sm"
                    onClick={() => setOwners(true)}
                  >
                    소유자 변경
                  </Button>
                )}
              </dd>
            </div>
            <div>
              <dt>저장소</dt>
              <dd className="tabular-nums">{service.repositories.length}개</dd>
            </div>
            <div>
              <dt>의존</dt>
              <dd className="tabular-nums">
                상위 {service.upstream.length}개, 하위{" "}
                {service.downstream.length}개
              </dd>
            </div>
            <div>
              <dt>만든 날</dt>
              <dd>{formatDate(service.createdAt)}</dd>
            </div>
            <div>
              <dt>수정한 날</dt>
              <dd>{formatDate(service.updatedAt)}</dd>
            </div>
          </dl>
          {!service.canEdit && !service.archived && (
            <p className="text-xs text-muted">
              소유자와 헤드 어드민이 수정할 수 있습니다.
            </p>
          )}
        </aside>
      </div>
      {owners && (
        <OwnersDialog service={service} open onClose={() => setOwners(false)} />
      )}
    </div>
  );
}

function AllLink({
  href,
  label,
}: {
  readonly href: string;
  readonly label: string;
}) {
  return (
    <Link
      href={href}
      className="ui-button ui-button-ghost ui-button-sm"
      aria-label={label}
    >
      전체 보기
    </Link>
  );
}

function RecentReleases({ service }: { readonly service: ServiceDetail }) {
  const releases = useQuery(serviceQueries.releases(service.id));
  return (
    <section aria-labelledby="recent-releases" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="recent-releases">최근 릴리스</h2>
        <AllLink
          href={`${routes.serviceDeploys(service.key)}&view=releases`}
          label="최근 릴리스 전체 보기"
        />
      </div>
      {/* 최근 3건 높이를 먼저 잡아 두어 늦게 와도(또는 적게 와도) 아래 칸이 밀리지 않는다. */}
      <div className="service-recent" data-kind="releases">
        <ReleasesState service={service} query={releases} compact>
          {(items) => (
            <ul className="service-list">
              {items.slice(0, 3).map((release) => (
                <ReleaseRow
                  key={release.id}
                  release={release}
                  href={`${routes.serviceDeploys(service.key)}&view=releases&release=${encodeURIComponent(release.id)}`}
                />
              ))}
            </ul>
          )}
        </ReleasesState>
      </div>
    </section>
  );
}

function RecentDeployments({ service }: { readonly service: ServiceDetail }) {
  const deployments = useQuery(serviceQueries.deployments(service.id));
  return (
    <section aria-labelledby="recent-deployments" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="recent-deployments">최근 배포</h2>
        <AllLink
          href={routes.serviceDeploys(service.key)}
          label="최근 배포 전체 보기"
        />
      </div>
      <div className="service-recent" data-kind="deployments">
        <DeploymentsState service={service} query={deployments} compact>
          {(items) => (
            <ol className="deploy-timeline">
              {items.slice(0, 3).map((deployment) => (
                <DeploymentEntry key={deployment.id} deployment={deployment} />
              ))}
            </ol>
          )}
        </DeploymentsState>
      </div>
    </section>
  );
}

/** 상세의 의존 그림: 이 서비스와 바로 이웃한 서비스만. 전체 그래프는 목록의 "의존관계" 보기에 있다. */
function NeighbourGraph({ service }: { readonly service: ServiceDetail }) {
  if (service.upstream.length + service.downstream.length === 0) return null;
  return (
    <section aria-label="이웃 의존 그래프" className="service-neighbours">
      <DependencyGraph highlight={service.id} graph={neighbourGraph(service)} />
    </section>
  );
}
