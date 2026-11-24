"use client";

import Link from "next/link";
import { Suspense, useState, type MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ReviewRequestList,
  priorityLabels,
  statusLabels,
  taskQueries,
  taskStatuses,
  type TaskCard,
  type TaskStatus,
} from "@/entities/task";
import { projectQueries } from "@/entities/project";
import type { User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import {
  BoardDetailPanel,
  type BoardDetailComponent,
} from "@/widgets/kanban-board";
import { routes } from "@/shared/config";
import { formatDate, useLastData } from "@/shared/lib";
import {
  EmptyState,
  ErrorState,
  Icon,
  ListSkeleton,
  PageHeader,
  SegmentedLinks,
} from "@/shared/ui";
import { normalizeApiError } from "@/shared/api";
import { homeQueries, type ActiveSprint, type Home } from "../api/home";
import { dueLabel, seoulToday } from "../model/attention";
import { AttentionSection } from "./AttentionSection";
import { Panel, RetryNote } from "./parts";

/** 내 업무(목록 보기). 보드 보기는 /me 이고 두 화면이 같은 머리글을 쓴다. */
export function HomePage({
  Detail,
}: {
  readonly Detail?: BoardDetailComponent;
}) {
  return (
    <AuthGuard require="work" fallback={<HomeSkeleton />}>
      {(user) => (
        <Suspense fallback={<HomeSkeleton />}>
          <HomeContent user={user} Detail={Detail} />
        </Suspense>
      )}
    </AuthGuard>
  );
}

function HomeContent({
  user,
  Detail,
}: {
  readonly user: User;
  readonly Detail?: BoardDetailComponent;
}) {
  const home = useQuery(homeQueries.mine());
  // 일시 장애면 60초까지만 마지막 내용을 두고, 권한·존재 오류(4xx)면 바로 비운다.
  const { data, stale } = useLastData(home);
  const board = useQuery(taskQueries.board("", true));
  const projects = useQuery(projectQueries.list());
  const [selected, setSelected] = useState<string | null>(null);
  const open = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      !Detail ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !window.matchMedia("(min-width: 768px)").matches
    )
      return;
    event.preventDefault();
    setSelected(id);
  };
  return (
    <div className="my-work">
      <HomeHeader date={data?.generatedAt} />
      {stale && (
        <RetryNote
          role="status"
          message="최신 정보를 불러오지 못해 마지막으로 받은 내용을 보여 줍니다."
          onRetry={() => void home.refetch()}
        />
      )}
      {/* 홈, 내 업무, 확인 필요 범위(프로젝트 목록)를 모두 받은 뒤 한 번에 그린다. 따로 그리면 늦게 온 구역이 아래를 민다. */}
      {home.isPending || board.isPending || projects.isPending ? (
        <HomeBodySkeleton />
      ) : home.isError && !data ? (
        <ErrorState
          title="최신 정보를 불러오지 못했습니다"
          description={normalizeApiError(home.error).message}
          onRetry={() => void home.refetch()}
        />
      ) : (
        data && (
          <>
            <Highlights data={data} user={user} />
            <MyTasks
              tasks={
                board.data?.groups.flatMap((group) =>
                  Object.values(group.columns).flat(),
                ) ?? []
              }
              pending={board.isPending}
              error={board.isError ? board.error : null}
              onRetry={() => void board.refetch()}
              today={seoulToday(data.generatedAt)}
              onOpen={open}
            />
            {data.activeSprints.length > 0 && (
              <Panel
                id="home-sprints"
                title="진행 중 스프린트"
                meta={`${data.activeSprints.length}개`}
              >
                <ul className="list">
                  {data.activeSprints.map((sprint) => (
                    <SprintRow key={sprint.id} sprint={sprint} />
                  ))}
                </ul>
              </Panel>
            )}
          </>
        )
      )}
      {Detail && selected && (
        <BoardDetailPanel
          taskId={selected}
          user={user}
          Detail={Detail}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/** 지금 봐야 할 것만: 확인 필요 항목과 리뷰 요청. 없으면 자리를 차지하지 않는다. */
function Highlights({
  data,
  user,
}: {
  readonly data: Home;
  readonly user: User;
}) {
  const now = Date.parse(data.generatedAt);
  return (
    <>
      <AttentionSection
        user={user}
        mine={data.attention}
        today={seoulToday(data.generatedAt)}
        now={now}
      />
      {user.githubLogin && data.reviewRequests.length > 0 && (
        <Panel
          id="home-reviews"
          title="리뷰 요청"
          meta={`${data.reviewRequests.length}건${reviewOverdue(data)}`}
        >
          <ReviewRequestList requests={data.reviewRequests} now={now} />
        </Panel>
      )}
    </>
  );
}

function reviewOverdue(data: Home) {
  const overdue = data.reviewRequests.filter((item) => item.overdue).length;
  return overdue > 0 ? ` (24시간 넘음 ${overdue}건)` : "";
}

/** 완료는 최근 것만 짧게, 빈 단계는 한 줄로 접는다. */
const DONE_PREVIEW = 5;

function MyTasks({
  tasks,
  pending,
  error,
  onRetry,
  today,
  onOpen,
}: {
  readonly tasks: readonly TaskCard[];
  readonly pending: boolean;
  readonly error: unknown;
  readonly onRetry: () => void;
  readonly today: string;
  readonly onOpen: (
    id: string,
  ) => (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const [showDone, setShowDone] = useState(false);
  if (pending) return <ListSkeleton label="내 업무를 불러오는 중" rows={3} />;
  if (error)
    return (
      <ErrorState
        title="내 업무를 불러오지 못했습니다"
        description={normalizeApiError(error).message}
        onRetry={onRetry}
      />
    );
  const byStatus = new Map<TaskStatus, TaskCard[]>(
    taskStatuses.map((status) => [status, []]),
  );
  for (const task of tasks) byStatus.get(task.status)?.push(task);
  const filled = taskStatuses.filter(
    (status) => (byStatus.get(status)?.length ?? 0) > 0,
  );
  const empty = taskStatuses.filter((status) => !filled.includes(status));
  if (filled.length === 0)
    return (
      <EmptyState
        title="맡은 업무가 없습니다"
        description="새 업무를 등록하거나 프로젝트 보드에서 업무를 가져오세요."
      />
    );
  return (
    <section aria-label="내 업무 목록" className="my-work-groups">
      {filled.map((status) => {
        const all = byStatus.get(status) ?? [];
        const shown =
          status === "DONE" && !showDone ? all.slice(0, DONE_PREVIEW) : all;
        return (
          <div key={status} className="task-group">
            <h2 className="task-group-title">
              <span
                className="status-icon"
                data-status={status}
                aria-hidden="true"
              />
              {statusLabels[status]}
              <span className="task-group-count">{all.length}</span>
            </h2>
            <ul className="list">
              {shown.map((task) => (
                <TaskListRow
                  key={task.id}
                  task={task}
                  today={today}
                  onOpen={onOpen(task.id)}
                />
              ))}
            </ul>
            {shown.length < all.length && (
              <button
                type="button"
                className="ui-link-button task-group-more"
                onClick={() => setShowDone(true)}
              >
                완료 {all.length - shown.length}개 더 보기
              </button>
            )}
          </div>
        );
      })}
      {empty.length > 0 && (
        <div className="task-group-empty flex flex-wrap gap-2">
          {empty.map((status) => (
            <span key={status} className="ui-badge">
              {statusLabels[status]} 0
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function TaskListRow({
  task,
  today,
  onOpen,
}: {
  readonly task: TaskCard;
  readonly today: string;
  readonly onOpen: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const source =
    task.projectName ?? (task.scope === "PERSONAL" ? "개인" : "팀 공용");
  return (
    <li className="list-row my-task-row">
      <Link
        href={routes.task(task.id)}
        className="list-row-main"
        onClick={onOpen}
      >
        <span className="list-row-title">{task.title}</span>
      </Link>
      <span className="list-row-meta">
        <span className="list-row-key" title={source}>
          {task.key ?? source}
        </span>
        {task.blocked && <span className="ui-badge badge-red">막힘</span>}
        {task.issue && (
          <span
            className="list-row-issue"
            title={task.issue.repositoryFullName}
          >
            {task.issue.repositoryFullName.split("/").pop()} #
            {task.issue.number}
          </span>
        )}
        {task.deadline && (
          <span
            className={task.deadline < today ? "text-danger" : undefined}
            title={`마감 ${formatDate(task.deadline)}`}
          >
            {dueLabel(today, task.deadline)}
          </span>
        )}
        <span
          className="priority-label"
          data-priority={task.priority}
          title={`우선순위 ${task.priority}`}
        >
          {priorityLabels[task.priority]}
        </span>
      </span>
    </li>
  );
}

function SprintRow({ sprint }: { readonly sprint: ActiveSprint }) {
  const total = Object.values(sprint.counts).reduce((sum, n) => sum + n, 0);
  const done = sprint.counts.DONE;
  return (
    <li className="list-row">
      <Link
        href={routes.projectSprint(sprint.projectId, sprint.id)}
        className="list-row-main"
      >
        <span className="list-row-key" title={sprint.projectName}>
          {sprint.projectKey}
        </span>
        <span className="list-row-title">{sprint.name}</span>
      </Link>
      <span className="list-row-meta">
        <span className={sprint.daysLeft < 0 ? "text-danger" : undefined}>
          {sprintLeft(sprint.daysLeft)}
        </span>
        {sprint.myOpenCount > 0 && (
          <span>내 열린 업무 {sprint.myOpenCount}</span>
        )}
        <progress
          className="home-progress"
          value={done}
          max={Math.max(total, 1)}
          aria-label={`완료 ${done} / 전체 ${total}`}
        />
        <span className="tabular-nums" aria-hidden="true">
          {done}/{total}
        </span>
      </span>
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

/** 머리글은 데이터와 상관없는 고정 모양이라 대기 중에도 그대로 그린다(보기 전환, 등록 버튼 자리 포함). */
function HomeHeader({ date }: { readonly date?: string }) {
  return (
    <PageHeader
      title="내 업무"
      subtitle={formatDate(date ?? new Date(), {
        year: undefined,
        weekday: "long",
      })}
      actions={
        <>
          <SegmentedLinks
            label="보기"
            items={[
              { href: routes.home, label: "목록", active: true },
              { href: routes.me, label: "보드", active: false },
            ]}
          />
          <Link
            href={`${routes.me}?create=1`}
            className="ui-button ui-button-primary"
          >
            {/* /me 의 Button 과 같은 구조(span 안 아이콘 + 글자)라 폭이 같고 보기 전환이 제자리에 있다. */}
            <span>
              <Icon name="plus" />
              업무 등록
            </span>
          </Link>
        </>
      }
    />
  );
}

function HomeBodySkeleton() {
  return <ListSkeleton label="내 업무를 불러오는 중" rows={4} />;
}

/** 인증 확인, Suspense 대기 자리: 실제 머리글 + 목록 자리. */
function HomeSkeleton() {
  return (
    <div className="my-work">
      <HomeHeader />
      <HomeBodySkeleton />
    </div>
  );
}
