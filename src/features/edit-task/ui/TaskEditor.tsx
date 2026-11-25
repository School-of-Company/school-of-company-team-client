"use client";

import { useId, useState, type FormEvent } from "react";
import {
  priorityLabels,
  sizeLabels,
  statusLabels,
  taskSizes,
  taskStatuses,
  type CreateTask,
  type TaskDetail,
  type TaskScope,
  type TaskSize,
  type TaskType,
  type TaskStatus,
  type UpdateTask,
} from "@/entities/task";
import type { PlanningBucket, ProjectDetail } from "@/entities/project";
import type { Milestone } from "@/entities/milestone";
import { normalizeApiError } from "@/shared/api";
import { todayIso } from "@/shared/lib";
import {
  dateBounds,
  dateErrors,
  overlapReason,
  overlapping,
  taskErrorMessage,
  type DateErrors,
} from "../model/rules";
import { TaskAssignees } from "./TaskAssignees";
import {
  Button,
  Checkbox,
  DatePicker,
  Field,
  Input,
  Label,
  Markdown,
  Select,
  Textarea,
} from "@/shared/ui";

const priorityOptions = (["P0", "P1", "P2", "P3"] as const).map((value) => ({
  value,
  label: priorityLabels[value],
}));

type Props = {
  readonly scope: TaskScope;
  readonly project?: ProjectDetail;
  readonly initial?: TaskDetail;
  readonly initialStatus?: TaskStatus;
  readonly initialBucketId?: string;
  /** 프로젝트 계획 버킷(아카이브 포함). 프로젝트 업무에서만 쓴다. */
  readonly buckets?: readonly PlanningBucket[];
  /** 프로젝트 Milestone. 프로젝트 업무에서만 쓴다. */
  readonly milestones?: readonly Milestone[];
  readonly candidates: readonly {
    readonly id: string;
    readonly name: string;
  }[];
  readonly onCreate?: (body: CreateTask) => Promise<void>;
  readonly onUpdate?: (body: UpdateTask) => Promise<void>;
  readonly onCancel: () => void;
};

export function TaskEditor({
  scope,
  project,
  initial,
  initialStatus,
  initialBucketId,
  buckets = [],
  milestones = [],
  candidates,
  onCreate,
  onUpdate,
  onCancel,
}: Props) {
  const prefix = useId();
  const [type, setType] = useState<TaskType>(
    initial?.type ?? (initialStatus === "REVIEW" ? "DEV" : "TASK"),
  );
  const [status, setStatus] = useState<TaskStatus>(
    initial?.status ?? initialStatus ?? "BACKLOG",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [descriptionMode, setDescriptionMode] = useState<"write" | "preview">(
    "write",
  );
  const [assignees, setAssignees] = useState<readonly string[]>(
    initial?.assignees.map((user) => user.id) ?? [],
  );
  const initialReviewers = initial?.reviewers?.map((user) => user.id) ?? [];
  const [reviewers, setReviewers] =
    useState<readonly string[]>(initialReviewers);
  const initialBucket = initial
    ? (initial.planningBucket?.id ?? "")
    : // 새 업무는 활성 버킷만 기본값이 된다(보관 버킷 id를 그대로 보내지 않는다).
      (buckets.find(
        (bucket) => bucket.id === initialBucketId && !bucket.archived,
      )?.id ?? "");
  // 보관된 버킷은 새로 고를 수 없지만 지금 들어 있는 업무에는 그대로 보여 준다.
  const bucketChoices = buckets.filter(
    (bucket) => !bucket.archived || bucket.id === initial?.planningBucket?.id,
  );
  const [blocked, setBlocked] = useState(initial?.blocked ?? false);
  const initialStartDate = initial?.startDate ?? "";
  const initialDeadline = initial?.deadline ?? "";
  const [startDate, setStartDate] = useState(initialStartDate);
  const [deadline, setDeadline] = useState(initialDeadline);
  const [dateError, setDateError] = useState<DateErrors>({});
  const today = todayIso();
  const { startMin, deadlineMin } = dateBounds({
    today,
    creating: !initial,
    startDate,
  });
  // 리뷰어는 개발 업무만(계약 D3-a). 일반 업무면 리뷰어 칸은 자리만 남기고 잠근다.
  const reviewing = scope !== "PERSONAL" && type === "DEV";
  const people = [
    ...new Map(
      [...candidates, ...(initial?.assignees ?? [])].map((person) => [
        person.id,
        person,
      ]),
    ).values(),
  ];

  const reviewerPeople = [
    ...new Map(
      [...candidates, ...(initial?.reviewers ?? [])].map((person) => [
        person.id,
        person,
      ]),
    ).values(),
  ];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const priorityValue = String(form.get("priority"));
    const priority =
      priorityValue === "P0" || priorityValue === "P1" || priorityValue === "P3"
        ? priorityValue
        : "P2";
    if (!title || title.length > 200) {
      setError("제목은 1~200자로 입력해 주세요.");
      return;
    }
    const dates = dateErrors({
      today,
      creating: !initial,
      startDate,
      deadline,
      initialDeadline,
    });
    setDateError(dates);
    if (dates.startDate || dates.deadline) return;
    const description = String(form.get("description") ?? "");
    const sizeValue = String(form.get("size") ?? "");
    const size = taskSizes.find((value) => value === sizeValue) ?? null;
    const initialSize: TaskSize | null = initial?.size ?? null;
    const partId = String(form.get("partId") ?? "");
    const bucketId = String(form.get("planningBucketId") ?? initialBucket);
    const initialMilestone = initial?.milestone?.id ?? "";
    const milestoneId = String(form.get("milestoneId") ?? initialMilestone);
    // 리뷰어는 개발 업무만(계약 D3-a). 일반 업무로 바꾸면 같은 요청에서 비운다.
    const nextReviewers = reviewing ? reviewers : [];
    if (overlapping(assignees, nextReviewers).length) {
      setError("담당자와 리뷰어에 같은 사람이 있어요. 한쪽에서 빼 주세요.");
      return;
    }
    const reviewersChanged =
      [...nextReviewers].sort().join() !== [...initialReviewers].sort().join();
    setPending(true);
    setError("");
    try {
      if (initial && onUpdate) {
        await onUpdate({
          title,
          description,
          type,
          priority,
          partId,
          ...(scope === "PERSONAL" ? {} : { assigneeIds: assignees }),
          ...(bucketId !== initialBucket ? { planningBucketId: bucketId } : {}),
          ...(milestoneId !== initialMilestone ? { milestoneId } : {}),
          ...(reviewersChanged ? { reviewerIds: nextReviewers } : {}),
          ...(size !== initialSize ? { size } : {}),
          ...(startDate !== initialStartDate
            ? { startDate: startDate || null }
            : {}),
          ...(deadline ? { deadline } : { clearDeadline: true }),
          blocked,
          blockedReason: String(form.get("blockedReason") ?? "").trim(),
        });
      } else if (onCreate) {
        await onCreate({
          scope,
          ...(project ? { projectId: project.id } : {}),
          title,
          description,
          type,
          priority,
          status,
          assigneeIds: scope === "PERSONAL" ? [] : assignees,
          ...(partId ? { partId } : {}),
          ...(bucketId ? { planningBucketId: bucketId } : {}),
          ...(milestoneId ? { milestoneId } : {}),
          ...(nextReviewers.length ? { reviewerIds: nextReviewers } : {}),
          ...(size ? { size } : {}),
          ...(startDate ? { startDate } : {}),
          ...(deadline ? { deadline } : {}),
        });
      }
    } catch (cause) {
      setError(
        taskErrorMessage(normalizeApiError(cause), [
          ...people,
          ...reviewerPeople,
        ]),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <Field id={`${prefix}-title`} label="제목 (필수)">
        <Input
          id={`${prefix}-title`}
          name="title"
          defaultValue={initial?.title}
          required
          maxLength={200}
          autoFocus
        />
      </Field>
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${prefix}-description`}>설명</Label>
          <div className="ui-segmented" role="group" aria-label="설명 보기">
            {(["write", "preview"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className="ui-segmented-option"
                aria-pressed={descriptionMode === mode}
                onClick={() => setDescriptionMode(mode)}
              >
                {mode === "write" ? "작성" : "미리보기"}
              </button>
            ))}
          </div>
        </div>
        <Textarea
          id={`${prefix}-description`}
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          hidden={descriptionMode === "preview"}
          aria-describedby={`${prefix}-description-hint`}
        />
        {descriptionMode === "preview" && (
          <div className="min-h-28 rounded-xl bg-surface-box p-4">
            {description.trim() ? (
              <Markdown>{description}</Markdown>
            ) : (
              <p className="text-sm text-muted">미리 볼 내용이 없습니다.</p>
            )}
          </div>
        )}
        <p id={`${prefix}-description-hint`} className="text-xs text-muted">
          마크다운을 지원합니다. (## 제목, - 목록, `코드`, [링크](url))
        </p>
      </div>
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium">우선순위</legend>
        <div className="ui-priority-picker">
          {priorityOptions.map((option) => (
            <label
              key={option.value}
              className="ui-priority-option"
              data-priority={option.value}
              title={option.value}
            >
              <input
                type="radio"
                name="priority"
                value={option.value}
                defaultChecked={(initial?.priority ?? "P2") === option.value}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium">크기</legend>
        <div className="ui-priority-picker">
          {(["", ...taskSizes] as const).map((value) => (
            <label
              key={value || "none"}
              className="ui-priority-option ui-size-option"
            >
              <input
                type="radio"
                name="size"
                value={value}
                defaultChecked={(initial?.size ?? "") === value}
              />
              {value ? `${value} ${sizeLabels[value]}` : "미정"}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <Field
          id={`${prefix}-start`}
          label="시작일 (선택)"
          error={dateError.startDate}
        >
          <DatePicker
            id={`${prefix}-start`}
            label="시작일"
            value={startDate}
            min={startMin}
            max={deadline || undefined}
            invalid={!!dateError.startDate}
            onChange={(next) => {
              setStartDate(next);
              setDateError({});
            }}
          />
        </Field>
        <Field
          id={`${prefix}-deadline`}
          label="마감일"
          error={dateError.deadline}
        >
          <DatePicker
            id={`${prefix}-deadline`}
            label="마감일"
            value={deadline}
            min={deadlineMin}
            invalid={!!dateError.deadline}
            onChange={(next) => {
              setDeadline(next);
              setDateError({});
            }}
          />
        </Field>
      </div>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <Field id={`${prefix}-type`} label="업무 타입">
          <Select
            id={`${prefix}-type`}
            value={type}
            onChange={(event) => {
              const next = event.target.value === "DEV" ? "DEV" : "TASK";
              setType(next);
              if (next === "TASK" && status === "REVIEW") setStatus("BACKLOG");
            }}
            disabled={initial?.status === "REVIEW"}
          >
            <option value="TASK">일반 업무</option>
            <option value="DEV">개발 업무</option>
          </Select>
        </Field>
        {!initial && (
          <Field id={`${prefix}-status`} label="시작 상태">
            <Select
              id={`${prefix}-status`}
              value={status}
              onChange={(event) => {
                const next = taskStatuses.find(
                  (value) => value === event.target.value,
                );
                if (next) setStatus(next);
              }}
            >
              {taskStatuses.map((value) => (
                <option
                  key={value}
                  value={value}
                  disabled={type === "TASK" && value === "REVIEW"}
                >
                  {statusLabels[value]}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {project && (
          <Field id={`${prefix}-part`} label="파트">
            <Select
              id={`${prefix}-part`}
              name="partId"
              defaultValue={initial?.part?.id ?? ""}
            >
              <option value="">미지정</option>
              {project.parts.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {project && bucketChoices.length > 0 && (
          <Field id={`${prefix}-bucket`} label="계획 버킷">
            <Select
              id={`${prefix}-bucket`}
              name="planningBucketId"
              defaultValue={initialBucket}
            >
              <option value="">없음</option>
              {bucketChoices.map((bucket) => (
                <option key={bucket.id} value={bucket.id}>
                  {bucket.archived ? `${bucket.name} (보관)` : bucket.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {project && milestones.length > 0 && (
          <Field id={`${prefix}-milestone`} label="마일스톤">
            <Select
              id={`${prefix}-milestone`}
              name="milestoneId"
              defaultValue={initial?.milestone?.id ?? ""}
            >
              <option value="">없음</option>
              {milestones.map((milestone) => (
                <option key={milestone.id} value={milestone.id}>
                  {milestone.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      {scope === "PERSONAL" ? (
        <p className="text-sm text-muted">담당자는 본인으로 고정됩니다.</p>
      ) : (
        <TaskAssignees
          people={people}
          selected={assignees}
          onChange={setAssignees}
          blocked={(id) =>
            reviewing
              ? overlapReason(id, assignees, reviewers, "리뷰어로 지정됨")
              : undefined
          }
        />
      )}
      {scope !== "PERSONAL" && (
        <TaskAssignees
          legend="리뷰어"
          hint={
            reviewing
              ? "여러 명 선택할 수 있어요. 담당자는 리뷰어가 될 수 없어요."
              : initialReviewers.length > 0
                ? `일반 업무로 바꾸면 리뷰어 ${initialReviewers.length}명이 해제돼요.`
                : "개발 업무에서만 리뷰어를 지정할 수 있어요."
          }
          empty="선택할 수 있는 리뷰어가 없습니다."
          disabled={!reviewing}
          people={reviewerPeople}
          selected={reviewing ? reviewers : []}
          onChange={setReviewers}
          blocked={(id) =>
            overlapReason(id, reviewers, assignees, "담당자로 지정됨")
          }
        />
      )}
      {initial && (
        <>
          <label className="flex min-h-11 items-center gap-3">
            <Checkbox
              checked={blocked}
              onChange={(event) => setBlocked(event.target.checked)}
            />
            막힘
          </label>
          {blocked && (
            <Field id={`${prefix}-reason`} label="막힌 사유 (필수)">
              <Textarea
                id={`${prefix}-reason`}
                name="blockedReason"
                defaultValue={initial.blockedReason ?? ""}
                required
                maxLength={500}
              />
            </Field>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          취소
        </Button>
        <Button type="submit" loading={pending}>
          {initial ? "변경 저장" : "업무 등록"}
        </Button>
      </div>
    </form>
  );
}
