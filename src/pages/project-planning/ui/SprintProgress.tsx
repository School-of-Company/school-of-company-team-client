"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ProjectDetail } from "@/entities/project";
import {
  sprintErrorMessage,
  sprintQueries,
  type CarryOver,
  type Sprint,
} from "@/entities/sprint";
import { statusLabels, taskQueries, taskStatuses } from "@/entities/task";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import { formatDate } from "@/shared/lib";
import { EmptyState, ErrorState, Skeleton } from "@/shared/ui";
import { boardTasks } from "../model/sprint-tasks";
import { TaskRow } from "./TaskRow";

/** 진행: 상태별 수와 업무 목록. 종료된 Sprint 는 종료 시 범위의 수와 이월 기록을 보여 준다. */
export function SprintProgress({
  project,
  sprint,
}: {
  readonly project: ProjectDetail;
  readonly sprint: Sprint;
}) {
  return (
    <div className="grid gap-5">
      <dl className="sprint-counts" aria-label="상태별 업무 수">
        {taskStatuses.map((status) => (
          <div key={status}>
            <dt>
              <span
                className="status-icon"
                data-status={status}
                aria-hidden="true"
              />
              {statusLabels[status]}
            </dt>
            <dd className="tabular-nums">{sprint.counts[status] ?? 0}</dd>
          </div>
        ))}
      </dl>
      {sprint.status === "CLOSED" ? (
        <CarryOvers project={project} sprint={sprint} />
      ) : (
        <ScopedTasks project={project} sprint={sprint} />
      )}
    </div>
  );
}

function ScopedTasks({
  project,
  sprint,
}: {
  readonly project: ProjectDetail;
  readonly sprint: Sprint;
}) {
  const board = useQuery(
    taskQueries.board(
      new URLSearchParams({
        project: project.key,
        sprint: sprint.id,
      }).toString(),
      false,
    ),
  );
  const tasks = boardTasks(board.data);
  const blocked = tasks.filter((task) => task.blocked);
  return (
    <section className="grid gap-3" aria-labelledby="progress-tasks">
      <div className="plan-pane-head">
        <h3 id="progress-tasks" className="planning-subhead">
          업무
        </h3>
        <Link
          href={`${routes.project(project.id)}?sprint=${sprint.status === "ACTIVE" ? "current" : encodeURIComponent(sprint.id)}`}
          className="ui-button ui-button-secondary ui-button-sm"
        >
          보드에서 보기
        </Link>
      </div>
      {board.isPending ? (
        <div
          role="status"
          aria-label="스프린트 업무 불러오는 중"
          className="grid gap-2"
        >
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      ) : board.isError ? (
        <ErrorState
          description={sprintErrorMessage(normalizeApiError(board.error))}
          onRetry={() => void board.refetch()}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="스프린트에 업무가 없습니다"
          description="계획 탭에서 업무를 넣으면 여기서 진행을 봅니다."
        />
      ) : (
        <>
          {blocked.length > 0 && (
            <p className="text-sm text-danger" role="status">
              막힌 업무 {blocked.length}개가 있습니다.
            </p>
          )}
          <ul className="plan-list" aria-label="스프린트 업무">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function CarryOvers({
  project,
  sprint,
}: {
  readonly project: ProjectDetail;
  readonly sprint: Sprint;
}) {
  const records = useQuery(sprintQueries.carryOvers(project.id, sprint.id));
  return (
    <section className="grid gap-3" aria-labelledby="carry-overs">
      <h3 id="carry-overs" className="planning-subhead">
        이월 기록
      </h3>
      <p className="planning-note">
        종료할 때 남은 업무를 어디로 옮겼는지 남긴 기록입니다.
      </p>
      {records.isPending ? (
        <Skeleton className="h-24" />
      ) : records.isError ? (
        <ErrorState
          description={sprintErrorMessage(normalizeApiError(records.error))}
          onRetry={() => void records.refetch()}
        />
      ) : records.data.length === 0 ? (
        <EmptyState
          title="이월한 업무가 없습니다"
          description="모든 업무를 끝내고 종료했습니다."
        />
      ) : (
        <ul className="plan-list" aria-label="이월 기록">
          {records.data.map((record) => (
            <li key={record.task.id} className="plan-task">
              <span
                className="status-icon"
                data-status={record.task.status}
                role="img"
                aria-label={statusLabels[record.task.status]}
              />
              <span className="plan-task-body">
                <span className="plan-task-title">
                  <span className="font-mono text-xs text-muted">
                    {record.task.key}
                  </span>{" "}
                  <Link
                    href={routes.task(record.task.id)}
                    className="hover:underline"
                  >
                    {record.task.title}
                  </Link>
                </span>
                <span className="plan-task-meta">
                  <span>{carryOverTarget(project.id, record)}</span>
                  <span>
                    {record.carriedBy.name}, {formatDate(record.carriedAt)}
                  </span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function carryOverTarget(projectId: string, record: CarryOver) {
  if (record.target === "SPRINT")
    return record.toSprint ? (
      <span>
        이월:{" "}
        <Link
          href={routes.projectSprint(projectId, record.toSprint.id)}
          className="underline"
        >
          스프린트 {record.toSprint.name}
        </Link>
      </span>
    ) : (
      "이월: 삭제된 스프린트"
    );
  if (record.target === "BUCKET")
    return `이동: 버킷 ${record.toBucket?.name ?? "(삭제됨)"}`;
  return "스프린트에서만 뺌";
}
