"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  incidentErrorMessage,
  incidentQueries,
  IncidentStatusLabel,
  isNotFound,
  postmortemStatusLabels,
  SeverityLabel,
  type IncidentDetail,
} from "@/entities/incident";
import { isHeadAdmin } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import {
  DeleteIncident,
  IncidentFormDialog,
  IncidentStatusDialog,
  nextStatus,
  nextStatusAction,
  PostmortemPanel,
} from "@/features/manage-incident";
import { routes } from "@/shared/config";
import { Button, ErrorState, StaleNotice } from "@/shared/ui";
import { IncidentProperties } from "./IncidentProperties";
import { IncidentTimeline } from "./IncidentTimeline";

const tabs = [
  { value: "timeline", label: "타임라인" },
  { value: "postmortem", label: "사후 검토" },
] as const;

export function IncidentDetailPage({
  incidentId,
}: {
  readonly incidentId: string;
}) {
  return (
    <AuthGuard require="work" fallback={<IncidentDetailSkeleton />}>
      {(user) => (
        <Suspense fallback={<IncidentDetailSkeleton />}>
          <IncidentDetailContent
            key={incidentId}
            incidentId={incidentId}
            headAdmin={isHeadAdmin(user)}
          />
        </Suspense>
      )}
    </AuthGuard>
  );
}

/** 상세 머리글(경로, 제목, 심각도 줄), 탭 줄, 타임라인과 속성 열을 실제와 같은 클래스로 잡는다. */
export function IncidentDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="장애를 불러오는 중"
      className="incident-detail incident-workspace grid gap-4"
    >
      <header aria-hidden="true" className="page-header">
        <div className="min-w-0">
          <p className="board-breadcrumb">
            <span className="ui-skeleton-text">장애 / 진행 중</span>
          </p>
          <h1 className="task-title font-semibold">
            <span className="ui-skeleton-text">장애 제목을 불러오는 중</span>
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-3">
            <span className="ui-skeleton-text text-xs">심각도 높음</span>
            <span className="ui-skeleton-text text-xs">대응 중</span>
          </p>
        </div>
        {/* 좁은 화면에서는 동작 버튼이 제목 아래 줄로 내려가므로 같은 줄을 잡는다. */}
        <div className="flex flex-wrap items-center gap-2">
          {["완화로 표시", "상태 변경", "수정"].map((label) => (
            <span
              key={label}
              className="ui-button ui-button-secondary ui-button-sm"
            >
              <span className="ui-skeleton-text">{label}</span>
            </span>
          ))}
        </div>
      </header>
      <div aria-hidden="true" className="project-nav flex border-b">
        {tabs.map((item) => (
          <span
            key={item.value}
            className="ui-nav-link flex items-center border-b-2 border-transparent"
          >
            <span className="ui-skeleton-text">{item.label}</span>
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="task-detail">
        <div className="task-detail-grid">
          <div className="task-main">
            <div className="ui-skeleton-list" />
          </div>
          <div className="task-props">
            <dl>
              {["심각도", "상태", "대응 책임자", "영향 서비스", "시작"].map(
                (label) => (
                  <div key={label}>
                    <dt>
                      <span className="ui-skeleton-text">{label}</span>
                    </dt>
                    <dd>
                      <span className="ui-skeleton-text">불러오는 중</span>
                    </dd>
                  </div>
                ),
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function IncidentDetailContent({
  incidentId,
  headAdmin,
}: {
  readonly incidentId: string;
  readonly headAdmin: boolean;
}) {
  const detail = useQuery(incidentQueries.detail(incidentId));
  if (isNotFound(detail.error))
    return (
      <ErrorState
        title="장애를 찾을 수 없습니다"
        description="삭제되었거나 주소가 잘못되었습니다. 장애 목록에서 다시 고르세요."
      />
    );
  if (!detail.data && detail.isError)
    return (
      <ErrorState
        description={incidentErrorMessage(detail.error)}
        onRetry={() => void detail.refetch()}
      />
    );
  if (!detail.data) return <IncidentDetailSkeleton />;
  return (
    <>
      <StaleNotice query={detail} />
      <IncidentWorkspace incident={detail.data} headAdmin={headAdmin} />
    </>
  );
}

function IncidentWorkspace({
  incident,
  headAdmin,
}: {
  readonly incident: IncidentDetail;
  readonly headAdmin: boolean;
}) {
  const pathname = usePathname() ?? routes.incident(incident.id);
  const search = useSearchParams();
  const tab =
    tabs.find((item) => item.value === search?.get("tab"))?.value ?? "timeline";
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<IncidentDetail["status"] | null>(null);
  return (
    <div className="incident-detail incident-workspace grid gap-4">
      <header className="page-header">
        <div className="min-w-0">
          <p className="board-breadcrumb">
            <Link href={routes.incidents}>장애</Link>
            <span aria-hidden="true">/</span>
            <span>{incident.status === "RESOLVED" ? "해결됨" : "진행 중"}</span>
          </p>
          <h1 className="task-title font-semibold">{incident.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-3">
            <SeverityLabel severity={incident.severity} />
            <IncidentStatusLabel status={incident.status} />
            {incident.postmortemStatus && (
              <span className="text-xs text-muted">
                사후 검토 {postmortemStatusLabels[incident.postmortemStatus]}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {incident.canEdit && (
            <>
              <Button
                className="ui-button-sm"
                onClick={() => setStatus(nextStatus[incident.status])}
              >
                {nextStatusAction[incident.status]}
              </Button>
              <Button
                variant="secondary"
                className="ui-button-sm"
                onClick={() => setStatus(incident.status)}
              >
                상태 변경
              </Button>
              <Button
                variant="secondary"
                className="ui-button-sm"
                onClick={() => setEditing(true)}
              >
                수정
              </Button>
            </>
          )}
          {headAdmin && <DeleteIncident incidentId={incident.id} />}
        </div>
      </header>
      <nav
        aria-label="장애 메뉴"
        className="project-nav flex min-w-0 overflow-x-auto border-b"
      >
        {tabs.map((item) => (
          <Link
            key={item.value}
            href={
              item.value === "timeline"
                ? pathname
                : `${pathname}?tab=${item.value}`
            }
            aria-current={tab === item.value ? "page" : undefined}
            className="ui-nav-link flex shrink-0 items-center border-b-2 border-transparent font-medium"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="task-detail">
        <div className="task-detail-grid">
          <div className="task-main">
            {tab === "timeline" ? (
              <IncidentTimeline incident={incident} />
            ) : (
              <PostmortemPanel incident={incident} />
            )}
          </div>
          <IncidentProperties incident={incident} headAdmin={headAdmin} />
        </div>
      </div>
      <IncidentFormDialog
        open={editing}
        incident={incident}
        onClose={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
      <IncidentStatusDialog
        open={!!status}
        incident={incident}
        initialStatus={status ?? incident.status}
        onClose={() => setStatus(null)}
      />
    </div>
  );
}
