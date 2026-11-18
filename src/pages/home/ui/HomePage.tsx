"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ReviewRequestList,
  TaskError,
  priorityLabels,
  type TaskCard,
} from "@/entities/task";
import type { User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { routes } from "@/shared/config";
import { formatDate } from "@/shared/lib";
import { Skeleton, Spinner } from "@/shared/ui";
import { homeQueries, type ActiveSprint, type Home } from "../api/home";
import { dueLabel, seoulToday } from "../model/attention";
import { AttentionSection } from "./AttentionSection";
import { Panel, RetryNote, TaskRow } from "./parts";

export function HomePage() {
  return (
    <AuthGuard require="work">
      {(user) => (
        <Suspense fallback={<Spinner />}>
          <HomeContent user={user} />
        </Suspense>
      )}
    </AuthGuard>
  );
}

function HomeContent({ user }: { readonly user: User }) {
  const home = useQuery(homeQueries.mine());
  const data = home.data;
  return (
    <div className="grid gap-5">
      <header className="board-header">
        <h1 className="text-xl font-semibold">홈</h1>
        <p className="mt-1 text-xs text-muted">
          {formatDate(data?.generatedAt ?? new Date(), {
            year: undefined,
            weekday: "long",
          })}
        </p>
      </header>
      {home.isError && data && (
        <RetryNote
          role="status"
          message="최신 정보를 불러오지 못해 마지막으로 받은 내용을 보여 줍니다."
          onRetry={() => void home.refetch()}
        />
      )}
      {home.isPending ? (
        <HomeSkeleton />
      ) : home.isError && !data ? (
        <TaskError error={home.error} onRetry={() => void home.refetch()} />
      ) : (
        data && <HomeSections data={data} user={user} />
      )}
    </div>
  );
}

function HomeSections({
  data,
  user,
}: {
  readonly data: Home;
  readonly user: User;
}) {
  const today = seoulToday(data.generatedAt);
  const now = Date.parse(data.generatedAt);
  return (
    <div className="home-grid">
      <div className="home-column">
        <AttentionSection
          user={user}
          mine={data.attention}
          today={today}
          now={now}
        />
        <Panel
          id="home-today"
          title="오늘 할 일"
          meta={`${data.today.inProgress.length + data.today.dueSoon.length}건`}
        >
          <TaskGroup
            title="진행 중"
            tasks={data.today.inProgress}
            today={today}
            empty="진행 중인 업무가 없습니다."
          />
          <TaskGroup
            title="3일 안에 마감"
            tasks={data.today.dueSoon}
            today={today}
            empty="3일 안에 마감되는 업무가 없습니다."
          />
        </Panel>
      </div>
      <div className="home-column">
        <Panel
          id="home-reviews"
          title="리뷰 요청"
          meta={
            user.githubLogin
              ? `${data.reviewRequests.length}건${reviewOverdue(data)}`
              : undefined
          }
        >
          {!user.githubLogin ? (
            <p className="home-note">
              GitHub 계정이 연결되지 않아 리뷰 요청을 가져올 수 없습니다.
            </p>
          ) : data.reviewRequests.length === 0 ? (
            <p className="home-note">내게 요청된 리뷰가 없습니다.</p>
          ) : (
            <ReviewRequestList requests={data.reviewRequests} now={now} />
          )}
        </Panel>
        <Panel
          id="home-sprints"
          title="진행 중 Sprint"
          meta={`${data.activeSprints.length}개`}
        >
          {data.activeSprints.length === 0 ? (
            <p className="home-note">
              참여 중인 프로젝트에 진행 중인 Sprint가 없습니다.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.activeSprints.map((sprint) => (
                <SprintRow key={sprint.id} sprint={sprint} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function reviewOverdue(data: Home) {
  const overdue = data.reviewRequests.filter((item) => item.overdue).length;
  return overdue > 0 ? `, 24시간 초과 ${overdue}건` : "";
}

function TaskGroup({
  title,
  tasks,
  today,
  empty,
}: {
  readonly title: string;
  readonly tasks: readonly TaskCard[];
  readonly today: string;
  readonly empty: string;
}) {
  return (
    <div className="home-group">
      <h3>
        {title} <span className="tabular-nums">{tasks.length}</span>
      </h3>
      {tasks.length === 0 ? (
        <p className="home-note">{empty}</p>
      ) : (
        <ul>
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task}>
              <span
                className="priority-label"
                data-priority={task.priority}
                title={`우선순위 ${task.priority}`}
              >
                {priorityLabels[task.priority]}
              </span>
              {task.deadline && (
                <span
                  className={
                    task.deadline < today ? "text-danger" : "text-foreground-2"
                  }
                  title={`마감 ${formatDate(task.deadline)}`}
                >
                  {dueLabel(today, task.deadline)}
                </span>
              )}
              {task.blocked && <span className="text-danger">막힘</span>}
            </TaskRow>
          ))}
        </ul>
      )}
    </div>
  );
}

function SprintRow({ sprint }: { readonly sprint: ActiveSprint }) {
  const total = Object.values(sprint.counts).reduce((sum, n) => sum + n, 0);
  const done = sprint.counts.DONE;
  return (
    <li className="home-sprint">
      <Link href={routes.project(sprint.projectId)} className="home-row-title">
        <span className="home-row-key" title={sprint.projectName}>
          {sprint.projectKey}
        </span>
        <span className="min-w-0 break-words">{sprint.name}</span>
      </Link>
      {sprint.goal && (
        <p className="text-sm break-words text-foreground-2">{sprint.goal}</p>
      )}
      <div className="home-sprint-meta">
        <span>
          {formatDate(sprint.startDate, { year: undefined })} ~{" "}
          {formatDate(sprint.endDate, { year: undefined })}
        </span>
        <span className={sprint.daysLeft < 0 ? "text-danger" : undefined}>
          {sprintLeft(sprint.daysLeft)}
        </span>
        {sprint.myOpenCount > 0 && (
          <span>내 열린 업무 {sprint.myOpenCount}</span>
        )}
      </div>
      <progress
        className="home-progress"
        value={done}
        max={Math.max(total, 1)}
        aria-label={`완료 ${done} / 전체 ${total}`}
      />
      <p className="text-xs text-muted tabular-nums" aria-hidden="true">
        완료 {done} / 전체 {total}
      </p>
    </li>
  );
}

const sprintLeft = (days: number) =>
  days === 0
    ? "오늘 종료"
    : days === 1
      ? "내일 종료"
      : days < 0
        ? `종료일 ${-days}일 지남`
        : `${days}일 남음`;

function HomeSkeleton() {
  return (
    <div role="status" aria-label="홈을 불러오는 중" className="home-grid">
      <div className="home-column">
        <Skeleton className="h-48" />
        <Skeleton className="h-40" />
      </div>
      <div className="home-column">
        <Skeleton className="h-28" />
        <Skeleton className="h-36" />
      </div>
    </div>
  );
}
