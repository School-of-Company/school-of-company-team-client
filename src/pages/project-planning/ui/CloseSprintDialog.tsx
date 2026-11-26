"use client";

import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { projectQueries, type ProjectDetail } from "@/entities/project";
import {
  closeSprintRequest,
  nextSprintDefaults,
  NEXT_SPRINT_DESTINATION,
  sprintErrorMessage,
  type CloseSprint,
  type Sprint,
} from "@/entities/sprint";
import { statusLabels, taskQueries } from "@/entities/task";
import { fieldErrors, normalizeApiError } from "@/shared/api";
import {
  Button,
  Checkbox,
  DatePicker,
  Dialog,
  ErrorState,
  Field,
  Input,
  Select,
  Skeleton,
} from "@/shared/ui";
import { boardTasks, openStatuses } from "../model/sprint-tasks";

/**
 * 종료·이월: 미완료 업무는 기본 대상으로 가고, 행마다 예외를 고른다.
 * 볼 수 없는 업무(비공개 원본)도 기본 대상으로 가므로 목록 전체를 요구하지 않는다(계약 D4-d).
 * 같은 요청에서 목표 달성을 적고 다음 스프린트를 만들 수 있다(s14 D14-c, D14-j).
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
  // 예정 스프린트가 없으면 다음 스프린트를 같이 만드는 것이 기본이다(D14-c).
  const defaults = nextSprintDefaults(sprint);
  const [createNext, setCreateNext] = useState(planned.length === 0);
  const [nextName, setNextName] = useState(defaults.name);
  const [nextStart, setNextStart] = useState(defaults.startDate);
  const [nextEnd, setNextEnd] = useState(defaults.endDate);
  const [startNext, setStartNext] = useState(false);
  const [goals, setGoals] = useState<Readonly<Record<string, boolean>>>(() =>
    Object.fromEntries(
      sprint.goalItems.flatMap((item) =>
        item.achieved === null ? [] : [[item.id, item.achieved]],
      ),
    ),
  );
  const choices = [
    ...(createNext
      ? [
          {
            value: NEXT_SPRINT_DESTINATION,
            label: `새 스프린트 ${nextName.trim() || defaults.name}`,
          },
        ]
      : []),
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
  const [picked, setFallback] = useState(choices[0]?.value ?? "NONE");
  const [pickedRows, setRows] = useState<Readonly<Record<string, string>>>({});
  // 새 스프린트를 끄면 그 대상을 고른 자리는 첫 선택지로 돌아간다.
  const valid = (value: string) =>
    choices.some((choice) => choice.value === value);
  const fallback = valid(picked) ? picked : (choices[0]?.value ?? "NONE");
  const rows = Object.fromEntries(
    Object.entries(pickedRows).map(([key, value]) => [
      key,
      valid(value) ? value : "",
    ]),
  );
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const fieldIds: Readonly<Record<string, string>> = {
    "nextSprint.name": `${id}-next-name`,
    "nextSprint.startDate": `${id}-next-start`,
    "nextSprint.endDate": `${id}-next-end`,
    goalResults: `${id}-goals`,
  };
  // 칸 오류는 그 칸 밑에 두고 첫 칸으로 초점을 옮긴다. 칸이 없는 오류만 폼 아래에 보인다.
  function showErrors(next: Readonly<Record<string, string>>) {
    setErrors(next);
    const first = Object.keys(fieldIds).find((key) => next[key]);
    if (first)
      requestAnimationFrame(() =>
        document.getElementById(fieldIds[first])?.focus(),
      );
  }
  const invalid = (key: string) =>
    errors[key]
      ? { "aria-invalid": true, "aria-describedby": `${fieldIds[key]}-error` }
      : {};
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
          const carry = closeSprintRequest(fallback, rows);
          if (!carry) return;
          if (createNext) {
            const local: Record<string, string> = {};
            if (!nextName.trim() || nextName.trim().length > 100)
              local["nextSprint.name"] = "이름은 1~100자로 입력하세요.";
            if (!nextStart)
              local["nextSprint.startDate"] = "시작일을 고르세요.";
            if (!nextEnd) local["nextSprint.endDate"] = "종료일을 고르세요.";
            else if (nextStart && nextEnd < nextStart)
              local["nextSprint.endDate"] =
                "종료일은 시작일과 같거나 뒤여야 해요.";
            if (Object.keys(local).length) return showErrors(local);
          }
          const body: CloseSprint = {
            ...carry,
            goalResults: Object.entries(goals).map(([id, achieved]) => ({
              id,
              achieved,
            })),
            ...(createNext
              ? {
                  nextSprint: {
                    create: true,
                    name: nextName.trim(),
                    startDate: nextStart,
                    endDate: nextEnd,
                    start: startNext,
                  },
                }
              : {}),
          };
          setErrors({});
          onSubmit(body, (cause) => {
            const problem = normalizeApiError(cause);
            showErrors(
              problem.code === "DUPLICATE_SPRINT_NAME" && createNext
                ? { "nextSprint.name": sprintErrorMessage(problem) }
                : fieldErrors(
                    problem,
                    Object.keys(fieldIds),
                    sprintErrorMessage(problem),
                  ),
            );
            // 그 사이 범위가 바뀌었으면 최신 미완료 목록으로 다시 고른다.
            if (problem.code === "STALE_SPRINT_SCOPE") {
              setRows({});
              void open.refetch();
            }
          });
        }}
      >
        {sprint.goalItems.length > 0 && (
          <fieldset
            id={fieldIds.goalResults}
            tabIndex={-1}
            className="grid min-w-0 gap-2"
            {...invalid("goalResults")}
          >
            <legend className="planning-subhead mb-2">목표 체크리스트</legend>
            <ul className="close-rows">
              {sprint.goalItems.map((item) => (
                <li key={item.id} className="close-row">
                  <span className="close-row-title min-w-0 wrap-anywhere">
                    {item.text}
                  </span>
                  <span
                    className="ui-segmented"
                    role="group"
                    aria-label={`${item.text} 결과`}
                  >
                    {([true, false] as const).map((value) => (
                      <button
                        key={String(value)}
                        type="button"
                        className="ui-segmented-option"
                        aria-pressed={goals[item.id] === value}
                        disabled={pending}
                        onClick={() =>
                          setGoals((current) => ({
                            ...current,
                            [item.id]: value,
                          }))
                        }
                      >
                        {value ? "달성" : "미달성"}
                      </button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">
              고르지 않은 항목은 미기록으로 남아요.
            </p>
            {errors.goalResults && (
              <p
                id={`${fieldIds.goalResults}-error`}
                role="alert"
                className="text-sm text-danger"
              >
                {errors.goalResults}
              </p>
            )}
          </fieldset>
        )}
        <fieldset className="grid min-w-0 gap-3">
          <legend className="sr-only">다음 스프린트</legend>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
            <Checkbox
              checked={createNext}
              disabled={pending}
              onChange={(event) => setCreateNext(event.target.checked)}
            />
            다음 스프린트 만들기
          </label>
          {createNext && (
            <div className="grid gap-4">
              <Field
                id={fieldIds["nextSprint.name"]}
                label="이름"
                error={errors["nextSprint.name"]}
              >
                <Input
                  id={fieldIds["nextSprint.name"]}
                  {...invalid("nextSprint.name")}
                  value={nextName}
                  maxLength={100}
                  disabled={pending}
                  onChange={(event) => setNextName(event.target.value)}
                />
              </Field>
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <Field
                  id={fieldIds["nextSprint.startDate"]}
                  label="시작일"
                  error={errors["nextSprint.startDate"]}
                >
                  <DatePicker
                    id={fieldIds["nextSprint.startDate"]}
                    label="다음 스프린트 시작일"
                    value={nextStart}
                    onChange={setNextStart}
                    disabled={pending}
                    invalid={!!errors["nextSprint.startDate"]}
                  />
                </Field>
                <Field
                  id={fieldIds["nextSprint.endDate"]}
                  label="종료일"
                  error={errors["nextSprint.endDate"]}
                >
                  <DatePicker
                    id={fieldIds["nextSprint.endDate"]}
                    label="다음 스프린트 종료일"
                    value={nextEnd}
                    min={nextStart || undefined}
                    onChange={setNextEnd}
                    disabled={pending}
                    invalid={!!errors["nextSprint.endDate"]}
                  />
                </Field>
              </div>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <Checkbox
                  checked={startNext}
                  disabled={pending}
                  onChange={(event) => setStartNext(event.target.checked)}
                />
                바로 시작
              </label>
            </div>
          )}
        </fieldset>
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
            내가 볼 수 없어 목록에 없는 업무도 함께 옮겨요. 완료 업무는 이
            스프린트에 남아요.
            {planned.length === 0 &&
              !createNext &&
              " 다음 스프린트로 옮기려면 다음 스프린트 만들기를 켜세요."}
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
              미완료 업무가 없어요. 바로 종료할 수 있어요.
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
                    <span className="min-w-0 wrap-anywhere">{task.title}</span>
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
        {errors.form && (
          <p role="alert" className="text-sm text-danger">
            {errors.form}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            취소
          </Button>
          <Button type="submit" loading={pending} disabled={open.isPending}>
            종료하고 결과 보고 열기
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
