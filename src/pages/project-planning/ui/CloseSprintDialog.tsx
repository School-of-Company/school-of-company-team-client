"use client";

import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { projectQueries, type ProjectDetail } from "@/entities/project";
import {
  closeSprintRequest,
  sprintErrorMessage,
  type CloseSprint,
  type Sprint,
} from "@/entities/sprint";
import { statusLabels, taskQueries } from "@/entities/task";
import { normalizeApiError } from "@/shared/api";
import { Button, Dialog, ErrorState, Select, Skeleton } from "@/shared/ui";
import { boardTasks, openStatuses } from "../model/sprint-tasks";

/**
 * 종료·이월: 미완료 업무는 기본 대상으로 가고, 행마다 예외를 고른다.
 * 볼 수 없는 업무(비공개 원본)도 기본 대상으로 가므로 목록 전체를 요구하지 않는다(계약 D4-d).
 */
export function CloseSprintDialog({
  project,
  sprint,
  sprints,
  pending,
  onClose,
  onSubmit,
}: {
  readonly project: ProjectDetail;
  readonly sprint: Sprint;
  readonly sprints: readonly Sprint[];
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (
    body: CloseSprint,
    onError: (cause: unknown) => void,
  ) => void;
}) {
  const id = useId();
  const open = useQuery(
    taskQueries.board(
      new URLSearchParams({
        project: project.key,
        sprint: sprint.id,
        status: openStatuses.join(","),
      }).toString(),
      false,
    ),
  );
  const buckets = useQuery(projectQueries.buckets(project.id));
  const planned = sprints.filter(
    (item) => item.status === "PLANNED" && item.id !== sprint.id,
  );
  const choices = [
    ...planned.map((item) => ({
      value: `SPRINT:${item.id}`,
      label: `스프린트 ${item.name}`,
    })),
    ...(buckets.data ?? [])
      .filter((bucket) => !bucket.archived)
      .sort((left, right) => left.position - right.position)
      .map((bucket) => ({
        value: `BUCKET:${bucket.id}`,
        label: `버킷 ${bucket.name}`,
      })),
    { value: "NONE", label: "스프린트에서 빼기만" },
  ];
  const [fallback, setFallback] = useState(choices[0]?.value ?? "NONE");
  const [rows, setRows] = useState<Readonly<Record<string, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const tasks = boardTasks(open.data);
  return (
    <Dialog
      open
      onClose={onClose}
      title={`${sprint.name} 종료`}
      className="close-sprint-dialog"
    >
      <form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          const body = closeSprintRequest(fallback, rows);
          if (!body) return;
          setError(null);
          onSubmit(body, (cause) => {
            const problem = normalizeApiError(cause);
            setError(sprintErrorMessage(problem));
            // 그 사이 범위가 바뀌었으면 최신 미완료 목록으로 다시 고른다.
            if (problem.code === "STALE_SPRINT_SCOPE") {
              setRows({});
              void open.refetch();
            }
          });
        }}
      >
        <div className="grid gap-2">
          <label htmlFor={`${id}-fallback`} className="text-sm font-medium">
            미완료 업무 기본 대상
          </label>
          <Select
            id={`${id}-fallback`}
            value={fallback}
            onChange={(event) => setFallback(event.target.value)}
            disabled={pending}
            aria-describedby={`${id}-hint`}
          >
            {choices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </Select>
          <p id={`${id}-hint`} className="text-xs text-muted">
            목록에 없는 업무(볼 수 없는 업무)도 기본 대상으로 옮깁니다. 완료
            업무는 이 스프린트에 남습니다.
            {planned.length === 0 &&
              " 다음 스프린트로 옮기려면 먼저 예정 스프린트를 만드세요."}
          </p>
        </div>
        <section className="grid gap-2" aria-labelledby={`${id}-rows`}>
          <h3 id={`${id}-rows`} className="planning-subhead">
            미완료 업무 <span className="tabular-nums">{tasks.length}</span>
          </h3>
          {open.isPending ? (
            <Skeleton className="h-24" />
          ) : open.isError ? (
            <ErrorState
              description={sprintErrorMessage(normalizeApiError(open.error))}
              onRetry={() => void open.refetch()}
            />
          ) : tasks.length === 0 ? (
            <p className="text-sm text-muted">
              미완료 업무가 없습니다. 바로 종료할 수 있습니다.
            </p>
          ) : (
            <ul className="close-rows">
              {tasks.map((task) => (
                <li key={task.id} className="close-row">
                  <span className="close-row-title">
                    <span
                      className="status-icon"
                      data-status={task.status}
                      role="img"
                      aria-label={statusLabels[task.status]}
                    />
                    <span className="font-mono text-xs text-muted">
                      {task.key}
                    </span>
                    <span className="min-w-0 break-words">{task.title}</span>
                  </span>
                  <Select
                    aria-label={`${task.key} 이월 대상`}
                    value={rows[task.id] ?? ""}
                    disabled={pending}
                    onChange={(event) =>
                      setRows((current) => ({
                        ...current,
                        [task.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">기본 대상</option>
                    {choices.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </Select>
                </li>
              ))}
            </ul>
          )}
        </section>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            취소
          </Button>
          <Button type="submit" loading={pending} disabled={open.isPending}>
            종료하고 이월
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
