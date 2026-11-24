"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ExperimentStatusLabel,
  OutcomeBadge,
  experimentApi,
  experimentErrorMessage,
  experimentQueries,
  type Experiment,
  type ExperimentStatus,
} from "@/entities/experiment";
import { isHeadAdmin, type User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import {
  ExperimentFormDialog,
  useExperimentMutation,
} from "@/features/manage-experiment";
import { routes } from "@/shared/config";
import { Button, ErrorState, StaleNotice } from "@/shared/ui";

import { Section, EditableSection } from "./LabSections";
import { FinishDialog } from "./LabFinishDialog";
import { Properties, Links } from "./LabProperties";
import { LabDeleteDialog } from "./LabDeleteDialog";

export function LabDetailPage({
  experimentId,
}: {
  readonly experimentId: string;
}) {
  return (
    <AuthGuard require="work" fallback={<LabDetailSkeleton />}>
      {(user) => (
        <Suspense fallback={<LabDetailSkeleton />}>
          <LabDetailContent experimentId={experimentId} user={user} />
        </Suspense>
      )}
    </AuthGuard>
  );
}

/** 머리글(경로, 제목, 상태 줄, 동작 버튼), 속성 줄, 본문 칸을 실제와 같은 클래스로 잡는다. */
export function LabDetailSkeleton() {
  return (
    <div role="status" aria-label="실험을 불러오는 중" className="lab-detail">
      <header aria-hidden="true" className="page-header">
        <div className="min-w-0">
          <p className="board-breadcrumb">
            <span className="ui-skeleton-text">실험실</span>
          </p>
          <h1>
            <span className="ui-skeleton-text">실험 제목을 불러오는 중</span>
          </h1>
          <p className="page-subtitle">
            <span className="ui-skeleton-text">진행 중</span>
          </p>
        </div>
        <div className="page-actions">
          <span className="ui-button ui-button-secondary">
            <span className="ui-skeleton-text">결과 정리하기</span>
          </span>
          <span className="ui-button ui-button-secondary">
            <span className="ui-skeleton-text">더 보기</span>
          </span>
        </div>
      </header>
      <section aria-hidden="true" className="lab-properties">
        <dl>
          {["담당자", "기간", "프로젝트"].map((label) => (
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
      </section>
      <div aria-hidden="true" className="lab-sections">
        <div className="ui-skeleton-list" />
      </div>
    </div>
  );
}

function LabDetailContent({
  experimentId,
  user,
}: {
  readonly experimentId: string;
  readonly user: User;
}) {
  const query = useQuery(experimentQueries.detail(experimentId));
  if (query.isPending) return <LabDetailSkeleton />;
  if (!query.data)
    return (
      <ErrorState
        description={experimentErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  return (
    <>
      <StaleNotice query={query} />
      <ExperimentView experiment={query.data} user={user} />
    </>
  );
}

function ExperimentView({
  experiment,
  user,
}: {
  readonly experiment: Experiment;
  readonly user: User;
}) {
  const [editing, setEditing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const status = useExperimentMutation((next: ExperimentStatus) =>
    experimentApi.changeStatus(experiment.id, { status: next }),
  );
  const finished =
    experiment.status === "DONE" || experiment.status === "STOPPED";
  return (
    <div className="lab-detail">
      <header className="page-header">
        <div className="min-w-0">
          <p className="board-breadcrumb">
            <Link href={routes.labs}>실험실</Link>
          </p>
          <h1 className="break-words">{experiment.title}</h1>
          <p className="page-subtitle flex flex-wrap items-center gap-2">
            <ExperimentStatusLabel status={experiment.status} />
            {experiment.outcome && (
              <OutcomeBadge outcome={experiment.outcome} />
            )}
          </p>
        </div>
        {experiment.canEdit && (
          <div className="page-actions">
            {experiment.status === "PLANNED" && (
              <Button
                loading={status.isPending}
                onClick={() => status.mutate("RUNNING")}
              >
                시작하기
              </Button>
            )}
            {experiment.status === "RUNNING" && (
              <Button onClick={() => setFinishing(true)}>결과 정리하기</Button>
            )}
            <details
              className="lab-action-menu"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector("summary")?.focus();
                }
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  event.currentTarget.open = false;
              }}
            >
              <summary
                className="ui-button ui-button-secondary"
                aria-label="실험 추가 동작"
              >
                더 보기
              </summary>
              <div className="lab-action-options">
                <Button variant="ghost" onClick={() => setEditing(true)}>
                  고치기
                </Button>
                {!finished && (
                  <Button
                    variant="ghost"
                    disabled={status.isPending}
                    onClick={() => status.mutate("STOPPED")}
                  >
                    중단
                  </Button>
                )}
                {finished && (
                  <Button
                    variant="ghost"
                    loading={status.isPending}
                    onClick={() => status.mutate("RUNNING")}
                  >
                    다시 열기
                  </Button>
                )}
                {experiment.canDelete && (
                  <Button variant="danger" onClick={() => setDeleting(true)}>
                    삭제
                  </Button>
                )}
              </div>
            </details>
          </div>
        )}
      </header>
      {status.isError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {experimentErrorMessage(status.error)}
        </p>
      )}
      <Properties experiment={experiment} />
      <div className="lab-sections">
        <Section
          title="가설"
          body={experiment.hypothesis}
          empty="확인할 가설을 적어 주세요."
          onWrite={experiment.canEdit ? () => setEditing(true) : undefined}
        />
        <Section
          title="측정 기준"
          body={experiment.metric}
          empty="성공을 판단할 기준을 적어 주세요."
          onWrite={experiment.canEdit ? () => setEditing(true) : undefined}
        />
        <Section
          title="해볼 것"
          body={experiment.method}
          empty="실험할 방법을 적어 주세요."
          onWrite={experiment.canEdit ? () => setEditing(true) : undefined}
        />
        <EditableSection
          experiment={experiment}
          field="result"
          title="결과"
          empty={
            finished
              ? "결과가 적혀 있지 않습니다."
              : "끝나면 측정한 값과 결과를 적습니다."
          }
        />
        <EditableSection
          experiment={experiment}
          field="learnings"
          title="배운 점"
          empty="성공이든 실패든 다음에 참고할 점을 남깁니다."
        />
        {experiment.outcome === "SUCCESS" && !experiment.promotedProjectId && (
          <div className="lab-promote">
            <p>
              효과가 확인된 실험입니다. 제대로 만들 거라면 프로젝트로 옮겨
              보세요.
            </p>
            {isHeadAdmin(user) && (
              <Link
                href="/admin?create=project"
                className="ui-button ui-button-secondary ui-button-sm"
              >
                프로젝트 만들기
              </Link>
            )}
          </div>
        )}
      </div>
      <Links experiment={experiment} />
      <ExperimentFormDialog
        open={editing}
        experiment={experiment}
        currentUserId={user.id}
        onClose={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
      <FinishDialog
        open={finishing}
        experiment={experiment}
        onClose={() => setFinishing(false)}
      />
      <LabDeleteDialog
        open={deleting}
        experiment={experiment}
        onClose={() => setDeleting(false)}
      />
    </div>
  );
}
