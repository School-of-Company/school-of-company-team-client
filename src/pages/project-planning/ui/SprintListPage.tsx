"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  nextSprintDates,
  seoulToday,
  sprintErrorMessage,
  sprintProgress,
  sprintQueries,
  sprintStatusLabels,
  type Sprint,
} from "@/entities/sprint";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  ListSkeleton,
  Markdown,
  QueryState,
} from "@/shared/ui";
import { useCreateSprint } from "../api/sprint-actions";
import { formatRange, remainingLabel } from "../model/dates";
import { ProgressBar } from "./ProgressBar";
import { ProjectFrame, type PlanningContext } from "./ProjectFrame";
import { SprintFormDialog } from "./SprintFormDialog";
import { SprintStatusBadge } from "./SprintStatus";
import { SprintTrend } from "./SprintTrend";

export function SprintListPage({ projectId }: { readonly projectId: string }) {
  return (
    <ProjectFrame projectId={projectId}>
      {(context) => <SprintList {...context} />}
    </ProjectFrame>
  );
}

function SprintList({ project, manages }: PlanningContext) {
  const router = useRouter();
  const sprints = useQuery(sprintQueries.list(project.id));
  const create = useCreateSprint(project.id);
  const [creating, setCreating] = useState(false);
  const today = seoulToday();
  const list = sprints.data ?? [];
  const active = list.find((sprint) => sprint.status === "ACTIVE");
  const planned = list.filter((sprint) => sprint.status === "PLANNED");
  const closed = list.filter((sprint) => sprint.status === "CLOSED");
  return (
    <section className="grid gap-5" aria-labelledby="sprints-heading">
      <div className="planning-section-head">
        <h2 id="sprints-heading" className="text-lg font-semibold">
          스프린트
        </h2>
        {manages && (
          <Button onClick={() => setCreating(true)}>
            <Icon name="plus" className="inline-block" /> 새 스프린트
          </Button>
        )}
      </div>
      <QueryState
        query={sprints}
        skeleton={
          <ListSkeleton
            label="스프린트 불러오는 중"
            rows={3}
            rowClassName="h-14"
          />
        }
        error={(error, retry) => (
          <ErrorState
            title="스프린트를 불러오지 못했습니다"
            description={sprintErrorMessage(normalizeApiError(error))}
            onRetry={retry}
          />
        )}
        empty={
          <EmptyState
            title="아직 스프린트가 없습니다"
            description={
              manages
                ? "기간과 목표를 정해 첫 스프린트를 만들고, 버킷이나 검토 필요 업무를 넣으세요."
                : "PM 또는 헤드 어드민이 스프린트를 만들면 여기에 보입니다."
            }
          />
        }
      >
        {() => (
          <>
            {active ? (
              <CurrentSprint
                projectId={project.id}
                sprint={active}
                today={today}
              />
            ) : (
              <p className="planning-note">
                진행 중인 스프린트가 없어요.
                {manages &&
                  planned.length > 0 &&
                  " 예정 스프린트를 열어 시작해요."}
              </p>
            )}
            <SprintRows projectId={project.id} title="예정" sprints={planned} />
            {closed.length > 0 && (
              <SprintTrend projectId={project.id} closedCount={closed.length} />
            )}
            <SprintRows projectId={project.id} title="종료" sprints={closed} />
          </>
        )}
      </QueryState>
      {creating && (
        <SprintFormDialog
          open={creating}
          defaults={nextSprintDates(list, today)}
          onClose={() => setCreating(false)}
          onSubmit={async (input) => {
            const sprint = await create.mutateAsync(input);
            router.push(
              `${routes.projectSprint(project.id, sprint.id)}?tab=plan`,
            );
          }}
        />
      )}
    </section>
  );
}

function CurrentSprint({
  projectId,
  sprint,
  today,
}: {
  readonly projectId: string;
  readonly sprint: Sprint;
  readonly today: string;
}) {
  const progress = sprintProgress(sprint.counts);
  const href = routes.projectSprint(projectId, sprint.id);
  return (
    <article className="sprint-current" aria-labelledby="current-sprint">
      <div className="sprint-current-head">
        <SprintStatusBadge status="ACTIVE" />
        <h3 id="current-sprint" className="text-base font-semibold">
          <Link href={href} className="hover:underline">
            {sprint.name}
          </Link>
        </h3>
      </div>
      <p className="sprint-meta">
        <span>{formatRange(sprint.startDate, sprint.endDate)}</span>
        <span>{remainingLabel(sprint.endDate, today)}</span>
      </p>
      {sprint.goal && (
        <div className="sprint-goal">
          <Markdown>{sprint.goal}</Markdown>
        </div>
      )}
      <ProgressBar
        done={progress.done}
        total={progress.total}
        label={`${sprint.name} 완료 비율`}
      />
      <div className="flex flex-wrap gap-2">
        <Link
          href={href}
          className="ui-button ui-button-secondary ui-button-sm"
        >
          진행 보기
        </Link>
        <Link
          href={`${routes.project(projectId)}?sprint=current`}
          className="ui-button ui-button-ghost ui-button-sm"
        >
          현재 스프린트 보드
        </Link>
      </div>
    </article>
  );
}

function SprintRows({
  projectId,
  title,
  sprints,
}: {
  readonly projectId: string;
  readonly title: string;
  readonly sprints: readonly Sprint[];
}) {
  if (!sprints.length) return null;
  return (
    <section className="grid gap-2" aria-label={`${title} 스프린트`}>
      <h3 className="planning-subhead">
        {title} <span className="tabular-nums">{sprints.length}</span>
      </h3>
      <ul className="sprint-rows">
        {sprints.map((sprint) => {
          const progress = sprintProgress(sprint.counts);
          return (
            <li key={sprint.id}>
              <Link
                href={routes.projectSprint(projectId, sprint.id)}
                className="sprint-row"
              >
                <span className="sprint-row-name">{sprint.name}</span>
                <span className="sprint-row-dates">
                  {formatRange(sprint.startDate, sprint.endDate)}
                </span>
                <span className="sprint-row-count tabular-nums">
                  {sprint.status === "CLOSED"
                    ? `완료 ${progress.done}/${progress.total}`
                    : `업무 ${progress.total}`}
                </span>
                <span className="sr-only">
                  {sprintStatusLabels[sprint.status]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
