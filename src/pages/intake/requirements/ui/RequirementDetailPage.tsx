"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  RequesterPriorityLabel,
  requirementErrorMessage,
  requirementQueries,
  RequirementStatusBadge,
} from "@/entities/requirement";
import { isHeadAdmin, type User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import { formatDate } from "@/shared/lib";
import { Button, Dialog, ErrorState, StaleNotice } from "@/shared/ui";
import { RequirementActions } from "./RequirementActions";
import { RequirementStatusForm } from "./RequirementStatusForm";
import { Sections, Requester, Events } from "./RequirementContent";
import { Messages } from "./RequirementMessages";
import { RequirementTasks } from "./RequirementTasks";

const dateTime = { hour: "2-digit", minute: "2-digit" } as const;

export function RequirementDetailPage({
  requirementId,
}: {
  readonly requirementId: string;
}) {
  return (
    <AuthGuard require="work" fallback={<RequirementDetailSkeleton />}>
      {(user) => <DetailContent requirementId={requirementId} user={user} />}
    </AuthGuard>
  );
}

/** 머리글(경로, 제목, 상태 줄, 상태 변경 버튼), 본문과 속성 카드 열을 실제와 같은 클래스로 잡는다. */
export function RequirementDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="요구사항 불러오는 중"
      className="requirement-detail grid gap-5"
    >
      <header aria-hidden="true" className="page-header">
        <div className="min-w-0">
          <p className="board-breadcrumb">
            <span className="ui-skeleton-text">요구사항 / 프로젝트</span>
          </p>
          <h1 className="task-title font-semibold">
            <span className="ui-skeleton-text">
              요구사항 제목을 불러오는 중
            </span>
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span className="ui-skeleton-text">검토 중</span>
            <span className="ui-skeleton-text">기능 요청</span>
            <span className="ui-skeleton-text">
              접수 2026년 11월 25일 오전 10:00
            </span>
          </p>
        </div>
        <span className="ui-button ui-button-secondary">
          <span className="ui-skeleton-text">상태 변경</span>
        </span>
      </header>
      <div aria-hidden="true" className="requirement-workspace">
        <div className="requirement-grid">
          <div className="requirement-main grid gap-6">
            <div className="ui-skeleton-list" />
          </div>
          <div className="requirement-aside grid content-start gap-4">
            <dl className="requirement-card requirement-properties">
              {["우선순위", "희망 일정", "업무 진행"].map((label) => (
                <div key={label}>
                  <dt>
                    <span className="ui-skeleton-text">{label}</span>
                  </dt>
                  <dd>
                    <span className="ui-skeleton-text">불러오는 중</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailContent({
  requirementId,
  user,
}: {
  readonly requirementId: string;
  readonly user: User;
}) {
  const [changingStatus, setChangingStatus] = useState(false);
  const detail = useQuery(requirementQueries.detail(requirementId));
  if (detail.isPending) return <RequirementDetailSkeleton />;
  if (!detail.data)
    return (
      <ErrorState
        title={
          normalizeApiError(detail.error).status === 404
            ? "요구사항을 찾을 수 없습니다"
            : undefined
        }
        description={requirementErrorMessage(detail.error)}
        onRetry={() => void detail.refetch()}
      />
    );
  const requirement = detail.data;
  return (
    <div className="requirement-detail grid gap-5 [overflow-wrap:anywhere] break-keep">
      <StaleNotice query={detail} />
      <header className="page-header">
        <div className="min-w-0">
          <p className="board-breadcrumb">
            <Link href={routes.requirements}>요구사항</Link>
            <span aria-hidden="true">/</span>
            {requirement.projectId ? (
              <Link href={routes.projectRequirements(requirement.projectId)}>
                {requirement.projectKey}
              </Link>
            ) : (
              <span>조직 단위</span>
            )}
          </p>
          <h1 className="task-title font-semibold">{requirement.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
            <RequirementStatusBadge status={requirement.status} />
            <span>{requirement.formTitle ?? "삭제된 양식"}</span>
            <span>접수 {formatDate(requirement.submittedAt, dateTime)}</span>
          </p>
        </div>
        {requirement.canManage && (
          <Button onClick={() => setChangingStatus(true)}>상태 변경</Button>
        )}
      </header>
      <div className="requirement-workspace">
        <div className="requirement-grid">
          <div className="requirement-main grid gap-6">
            <Sections requirement={requirement} />
            <RequirementTasks requirement={requirement} />
            <Messages requirement={requirement} />
            <Events requirement={requirement} />
          </div>
          <aside
            className="requirement-aside grid content-start gap-4"
            aria-label="요구사항 속성"
          >
            <dl className="requirement-card requirement-properties">
              {requirement.statusReason && (
                <div>
                  <dt>사유</dt>
                  <dd className="whitespace-pre-wrap">
                    {requirement.statusReason}
                  </dd>
                </div>
              )}
              <div>
                <dt>우선순위</dt>
                <dd>
                  <RequesterPriorityLabel
                    priority={requirement.requesterPriority}
                  />
                </dd>
              </div>
              <div>
                <dt>희망 일정</dt>
                <dd>
                  {requirement.desiredDate
                    ? formatDate(requirement.desiredDate)
                    : "없음"}
                </dd>
              </div>
              <div>
                <dt>업무 진행</dt>
                <dd className="tabular-nums">
                  {requirement.progress.done}/{requirement.progress.total} 완료
                </dd>
              </div>
              {requirement.closedAt && (
                <div>
                  <dt>닫힘</dt>
                  <dd>{formatDate(requirement.closedAt)}</dd>
                </div>
              )}
            </dl>
            <Requester requirement={requirement} />
            <RequirementActions
              requirement={requirement}
              lead={isHeadAdmin(user)}
            />
          </aside>
        </div>
      </div>
      <Dialog
        open={changingStatus}
        onClose={() => setChangingStatus(false)}
        title="요구사항 상태 변경"
      >
        {changingStatus && (
          <RequirementStatusForm
            key={`${requirement.status}:${requirement.statusReason ?? ""}`}
            requirement={requirement}
            onSaved={() => setChangingStatus(false)}
          />
        )}
      </Dialog>
    </div>
  );
}
