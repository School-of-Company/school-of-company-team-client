"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ExperimentStatusLabel,
  OutcomeBadge,
  experimentErrorMessage,
  experimentKeys,
  experimentQueries,
  type Experiment,
  type ExperimentView,
} from "@/entities/experiment";
import type { User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { ExperimentFormDialog } from "@/features/manage-experiment";
import { routes } from "@/shared/config";
import { formatDate, keepPreviousKey, settledData } from "@/shared/lib";
import {
  Button,
  EmptyState,
  Icon,
  ListSkeleton,
  PageHeader,
  PageSkeleton,
  QueryState,
  SegmentedLinks,
} from "@/shared/ui";

const views: readonly { value: ExperimentView; label: string }[] = [
  { value: "ACTIVE", label: "진행 중" },
  { value: "DONE", label: "끝난 실험" },
  { value: "ALL", label: "전체" },
];

/** 실험실: 확신 없는 시도를 가설 → 결과로 작게 해 보고 팀에 남긴다. 보기는 `?view=`. */
export function LabListPage() {
  return (
    <AuthGuard require="work">
      {(user) => (
        <Suspense fallback={<PageSkeleton label="실험 불러오는 중" />}>
          <LabListContent user={user} />
        </Suspense>
      )}
    </AuthGuard>
  );
}

function LabListContent({ user }: { readonly user: User }) {
  const router = useRouter();
  const search = useSearchParams();
  const view =
    views.find((item) => item.value === search?.get("view"))?.value ?? "ACTIVE";
  const [creating, setCreating] = useState(false);
  const experiments = useQuery({
    ...experimentQueries.list(view),
    placeholderData: keepPreviousKey(experimentKeys.list(view)),
  });
  const label = views.find((item) => item.value === view)?.label ?? "";
  const count = settledData(experiments)?.length;
  return (
    <div className="grid gap-5">
      <PageHeader
        title="실험실"
        subtitle={
          count !== undefined
            ? `${label} ${count}개`
            : experiments.isError && !experiments.data
              ? "실험 집계를 불러오지 못했어요"
              : "집계 중"
        }
        actions={
          <Button onClick={() => setCreating(true)}>
            <Icon name="plus" className="inline-block" /> 새 실험
          </Button>
        }
      />
      <div className="page-toolbar">
        <SegmentedLinks
          label="실험 보기"
          items={views.map((item) => ({
            href:
              item.value === "ACTIVE"
                ? routes.labs
                : `${routes.labs}?view=${item.value}`,
            label: item.label,
            active: view === item.value,
          }))}
        />
      </div>
      <QueryState
        query={experiments}
        skeleton={
          <ListSkeleton label="실험을 불러오는 중" rowClassName="h-13" />
        }
        errorMessage={experimentErrorMessage}
        empty={
          view === "ACTIVE" ? (
            <EmptyState
              title="진행 중인 실험이 없습니다"
              description="해 보고 싶은 기술, 방식이 있으면 가설과 측정 기준을 적고 작게 시작해 보세요."
            />
          ) : (
            <EmptyState title={`${label} 실험이 없습니다`} />
          )
        }
      >
        {(data) => (
          <ul className="list" aria-label="실험 목록">
            {data.map((experiment) => (
              <ExperimentRow key={experiment.id} experiment={experiment} />
            ))}
          </ul>
        )}
      </QueryState>
      <ExperimentFormDialog
        open={creating}
        currentUserId={user.id}
        onClose={() => setCreating(false)}
        onSaved={(experiment) => {
          setCreating(false);
          router.push(routes.lab(experiment.id));
        }}
      />
    </div>
  );
}

function ExperimentRow({ experiment }: { readonly experiment: Experiment }) {
  const finished =
    experiment.status === "DONE" || experiment.status === "STOPPED";
  return (
    <li className="list-row">
      <ExperimentStatusLabel status={experiment.status} />
      <Link href={routes.lab(experiment.id)} className="list-row-main">
        <span className="list-row-title">{experiment.title}</span>
      </Link>
      <span className="list-row-meta">
        {experiment.outcome && <OutcomeBadge outcome={experiment.outcome} />}
        {experiment.owner && <span>{experiment.owner.name}</span>}
        <span className="tabular-nums">
          {finished
            ? formatDate(experiment.finishedAt, { year: undefined })
            : experiment.endDate
              ? `~ ${formatDate(experiment.endDate, { year: undefined })}`
              : "기간 미정"}
        </span>
      </span>
    </li>
  );
}
