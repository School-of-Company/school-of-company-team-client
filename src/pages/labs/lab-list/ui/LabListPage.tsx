"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ExperimentStatusLabel,
  OutcomeBadge,
  experimentErrorMessage,
  experimentQueries,
  type Experiment,
  type ExperimentView,
} from "@/entities/experiment";
import type { User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { ExperimentFormDialog } from "@/features/manage-experiment";
import { routes } from "@/shared/config";
import { formatDate } from "@/shared/lib";
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  Skeleton,
  Spinner,
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
        <Suspense fallback={<Spinner label="실험 불러오는 중" />}>
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
  const experiments = useQuery(experimentQueries.list(view));
  const label = views.find((item) => item.value === view)?.label ?? "";
  return (
    <div className="grid gap-5">
      <header className="page-header">
        <div className="min-w-0">
          <h1>실험실</h1>
          <p className="page-subtitle">
            작게 해 보고, 결과를 남기고, 효과가 있으면 프로젝트로 옮깁니다.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Icon name="plus" className="inline-block" /> 새 실험
        </Button>
      </header>
      <nav aria-label="실험 보기" className="settings-nav">
        {views.map((item) => (
          <Link
            key={item.value}
            href={
              item.value === "ACTIVE"
                ? routes.labs
                : `${routes.labs}?view=${item.value}`
            }
            aria-current={view === item.value ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {experiments.isPending ? (
        <div
          role="status"
          aria-label="실험을 불러오는 중"
          className="grid gap-2"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-14" />
          ))}
        </div>
      ) : !experiments.data ? (
        <ErrorState
          description={experimentErrorMessage(experiments.error)}
          onRetry={() => void experiments.refetch()}
        />
      ) : experiments.data.length === 0 ? (
        view === "ACTIVE" ? (
          <EmptyState
            title="진행 중인 실험이 없습니다"
            description="해 보고 싶은 기술·방식이 있으면 가설과 측정 기준을 적고 작게 시작해 보세요."
          />
        ) : (
          <EmptyState title={`${label} 실험이 없습니다`} />
        )
      ) : (
        <ul className="list" aria-label="실험 목록">
          {experiments.data.map((experiment) => (
            <ExperimentRow key={experiment.id} experiment={experiment} />
          ))}
        </ul>
      )}
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
