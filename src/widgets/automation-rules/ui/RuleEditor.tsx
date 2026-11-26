"use client";

import { useRef, useState, type ReactNode } from "react";
import type { PlanningBucket, ProjectDetail } from "@/entities/project";
import {
  priorityLabels,
  statusLabels,
  type TaskPriority,
} from "@/entities/task";
import { normalizeApiError } from "@/shared/api";
import { formatDate } from "@/shared/lib";
import {
  Button,
  Checkbox,
  Dialog,
  Field,
  Input,
  Label,
  Select,
  Textarea,
} from "@/shared/ui";
import {
  actionHelp,
  actionLabels,
  allowedActions,
  changeEvent,
  conditionFields,
  conditionValueLabel,
  dayLabels,
  daysOfWeek,
  emptyRuleForm,
  eventHelp,
  eventLabel,
  eventStatusOptions,
  fieldLabels,
  formToRequest,
  isTasklessEvent,
  acceptsMessageTemplate,
  MESSAGE_TEMPLATE_MAX,
  resultMessage,
  ruleErrorMessage,
  ruleToForm,
  selectableEvents,
  templateVariables,
  TITLE_TEMPLATE_MAX,
  typeLabels,
  UNASSIGNED_VALUE,
  validateRuleForm,
  type AutomationRule,
  type RuleAction,
  type RuleConditionField,
  type RuleEvent,
  type RuleForm,
  type RuleFormErrors,
} from "../model/rule";
import { useRuleChange, useRulePreview } from "../api/rules";
import { RunStatus } from "./RuleRuns";

type Option = { readonly value: string; readonly label: string };

const priorities = Object.keys(priorityLabels) as TaskPriority[];
const hours = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * 규칙 생성·편집 창. `rule` 이 없으면 새 규칙이고, `initial`(템플릿)이 있으면 그 값으로 채운다.
 * 열 때마다 폼을 새로 그려 이전 입력이 남지 않는다.
 */
export function RuleEditor(props: {
  readonly open: boolean;
  readonly project: ProjectDetail;
  readonly buckets: readonly PlanningBucket[];
  /** 리뷰어·담당자 후보 = 프로젝트의 활성 참여자. */
  readonly participants: readonly Option[];
  readonly rule: AutomationRule | null;
  readonly initial?: RuleForm;
  readonly onClose: () => void;
}) {
  const change = useRuleChange(props.project.id);
  const close = () => {
    if (change.isPending) return;
    change.reset();
    props.onClose();
  };
  return (
    <Dialog
      open={props.open}
      onClose={close}
      title={props.rule ? "규칙 편집" : "새 규칙"}
      className="rule-dialog"
    >
      {props.open && (
        <RuleEditorForm
          key={props.rule?.id ?? props.initial?.name ?? "new"}
          {...props}
          change={change}
          onClose={close}
        />
      )}
    </Dialog>
  );
}

function RuleEditorForm({
  project,
  buckets,
  participants,
  rule,
  initial,
  change,
  onClose,
}: {
  readonly project: ProjectDetail;
  readonly buckets: readonly PlanningBucket[];
  readonly participants: readonly Option[];
  readonly rule: AutomationRule | null;
  readonly initial?: RuleForm;
  readonly change: ReturnType<typeof useRuleChange>;
  readonly onClose: () => void;
}) {
  const [form, setForm] = useState<RuleForm>(
    () => initial ?? (rule ? ruleToForm(rule) : emptyRuleForm()),
  );
  const [errors, setErrors] = useState<RuleFormErrors>({});
  const preview = useRulePreview(project.id);
  // 미리보기를 보낸 본문. 폼이 바뀌면 결과가 지난 것임을 알린다.
  const [previewed, setPreviewed] = useState("");
  const set = (patch: Partial<RuleForm>) =>
    setForm((current) => ({ ...current, ...patch }));
  const taskless = isTasklessEvent(form.event);
  const variables = templateVariables(form.event);
  // 클라이언트가 모르는 이벤트 규칙을 열어도 선택 칸이 다른 이벤트로 보이지 않게 그 값을 그대로 둔다.
  const events = selectableEvents.includes(form.event)
    ? selectableEvents
    : [...selectableEvents, form.event];
  const options: Readonly<Record<RuleConditionField, readonly Option[]>> = {
    PRIORITY: priorities.map((value) => ({
      value,
      label: priorityLabels[value],
    })),
    TYPE: (["DEV", "TASK"] as const).map((value) => ({
      value,
      label: typeLabels[value],
    })),
    PART: project.parts.map((part) => ({ value: part.id, label: part.name })),
    // 보관된 버킷도 조건으로는 쓸 수 있다(이미 들어 있는 업무가 있다).
    BUCKET: buckets.map((bucket) => ({
      value: bucket.id,
      label: bucket.archived ? `${bucket.name}(보관됨)` : bucket.name,
    })),
    UNASSIGNED: [{ value: UNASSIGNED_VALUE, label: "담당자 없음" }],
  };
  const activeBuckets = buckets.filter((bucket) => !bucket.archived);
  const id = (name: string) => `rule-${rule?.id ?? "new"}-${name}`;

  function toggleCondition(field: RuleConditionField, value: string) {
    const current = form.conditions[field];
    set({
      conditions: {
        ...form.conditions,
        [field]: current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      },
    });
  }
  function check() {
    const found = validateRuleForm(form);
    setErrors(found);
    return Object.keys(found).length === 0;
  }
  function submit() {
    if (change.isPending || !check()) return;
    const body = formToRequest(form);
    change.mutate(
      rule
        ? { kind: "update", ruleId: rule.id, body }
        : { kind: "create", body },
      {
        onSuccess: () => {
          change.reset();
          onClose();
        },
      },
    );
  }
  function runPreview() {
    if (preview.isPending || !check()) return;
    const body = formToRequest(form);
    setPreviewed(JSON.stringify(body));
    preview.mutate(body);
  }
  const previewStale =
    !!previewed && previewed !== JSON.stringify(formToRequest(form));

  return (
    <form
      className="grid gap-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Field id={id("name")} label="이름" error={errors.name}>
        <Input
          id={id("name")}
          value={form.name}
          maxLength={100}
          required
          autoFocus
          aria-invalid={!!errors.name || undefined}
          aria-describedby={errors.name ? `${id("name")}-error` : undefined}
          onChange={(event) => set({ name: event.target.value })}
        />
      </Field>
      <div className="grid gap-2">
        <div className="rule-form-row">
          <Field id={id("event")} label="언제">
            <Select
              id={id("event")}
              value={form.event}
              aria-describedby={id("event-help")}
              onChange={(event) =>
                setForm((current) =>
                  changeEvent(current, event.target.value as RuleEvent),
                )
              }
            >
              {events.map((value) => (
                <option key={value} value={value}>
                  {eventLabel(value)}
                </option>
              ))}
            </Select>
          </Field>
          {form.event === "TASK_STATUS_CHANGED" && (
            <Field id={id("status")} label="바뀐 상태">
              <Select
                id={id("status")}
                value={form.eventStatus}
                onChange={(event) =>
                  set({
                    eventStatus: event.target.value as RuleForm["eventStatus"],
                  })
                }
              >
                <option value="">모든 상태</option>
                {eventStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {form.event === "TASK_STALE" && (
            <Field
              id={id("stale")}
              label="멈춘 일수"
              hint="1일부터 30일까지 정할 수 있어요."
              error={errors.staleDays}
            >
              <Input
                id={id("stale")}
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                step={1}
                value={form.staleDays}
                aria-invalid={!!errors.staleDays || undefined}
                aria-describedby={[
                  `${id("stale")}-hint`,
                  errors.staleDays ? `${id("stale")}-error` : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onChange={(event) => set({ staleDays: event.target.value })}
              />
            </Field>
          )}
        </div>
        <p id={id("event-help")} className="text-xs text-muted">
          {eventHelp(form.event)}
        </p>
      </div>
      {form.event === "SCHEDULE" && (
        <fieldset
          className="grid gap-2"
          aria-describedby={errors.schedule ? id("schedule-error") : undefined}
        >
          <legend className="text-sm font-medium">요일과 시각</legend>
          <div className="rule-schedule">
            <span className="rule-chips" role="group" aria-label="요일">
              {daysOfWeek.map((day) => {
                const on = form.scheduleDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    className="rule-chip"
                    aria-pressed={on}
                    onClick={() =>
                      set({
                        scheduleDays: on
                          ? form.scheduleDays.filter((item) => item !== day)
                          : [...form.scheduleDays, day],
                      })
                    }
                  >
                    {dayLabels[day]}
                  </button>
                );
              })}
            </span>
            <Select
              aria-label="시각"
              className="rule-hour"
              value={form.scheduleHour}
              onChange={(event) =>
                set({ scheduleHour: Number(event.target.value) })
              }
            >
              {hours.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}시
                </option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-muted">
            한국 시간 기준입니다. 저장한 뒤에 오는 시각부터 실행합니다.
          </p>
          {errors.schedule && (
            <p
              id={id("schedule-error")}
              role="alert"
              className="text-sm text-danger"
            >
              {errors.schedule}
            </p>
          )}
        </fieldset>
      )}
      {!taskless && (
        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium">조건</legend>
          <p className="-mt-1 text-xs text-muted">
            비우면 이 프로젝트의 모든 업무에 걸립니다. 한 항목 안에서는 하나만
            맞으면 되고, 항목끼리는 모두 맞아야 합니다.
          </p>
          {conditionFields.map((field) => {
            const known = new Set(options[field].map((item) => item.value));
            // 지워진 파트·버킷 조건도 보여 줘야 뺄 수 있다.
            const missing = form.conditions[field].filter(
              (value) => !known.has(value),
            );
            const chips = [
              ...options[field],
              ...missing.map((value) => ({
                value,
                label: conditionValueLabel(field, value, null),
              })),
            ];
            return (
              <div
                key={field}
                role="group"
                aria-labelledby={id(`field-${field}`)}
                className="rule-condition"
              >
                <span id={id(`field-${field}`)} className="text-sm">
                  {fieldLabels[field]}
                </span>
                {chips.length === 0 ? (
                  <span className="text-xs text-muted">
                    {field === "PART"
                      ? "이 프로젝트에 파트가 없습니다."
                      : "이 프로젝트에 버킷이 없습니다."}
                  </span>
                ) : (
                  <span className="rule-chips">
                    {chips.map((chip) => (
                      <button
                        key={chip.value}
                        type="button"
                        className="rule-chip"
                        aria-pressed={form.conditions[field].includes(
                          chip.value,
                        )}
                        onClick={() => toggleCondition(field, chip.value)}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </fieldset>
      )}
      <div className="grid gap-2">
        <div className="rule-form-row">
          <Field id={id("action")} label="동작">
            <Select
              id={id("action")}
              value={form.action}
              aria-describedby={id("action-help")}
              onChange={(event) =>
                set({ action: event.target.value as RuleAction })
              }
            >
              {allowedActions(form.event).map((value) => (
                <option key={value} value={value}>
                  {actionLabels[value]}
                </option>
              ))}
            </Select>
          </Field>
          {form.action === "MOVE_BUCKET" && (
            <Field id={id("bucket")} label="옮길 버킷" error={errors.bucketId}>
              <Select
                id={id("bucket")}
                value={form.bucketId}
                aria-invalid={!!errors.bucketId || undefined}
                aria-describedby={
                  errors.bucketId ? `${id("bucket")}-error` : undefined
                }
                onChange={(event) => set({ bucketId: event.target.value })}
              >
                <option value="">버킷 선택</option>
                {activeBuckets.map((bucket) => (
                  <option key={bucket.id} value={bucket.id}>
                    {bucket.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {form.action === "ASSIGN_REVIEWER" && (
            <ParticipantSelect
              id={id("reviewer")}
              label="리뷰어"
              value={form.reviewerId}
              error={errors.reviewerId}
              participants={participants}
              onChange={(reviewerId) => set({ reviewerId })}
            />
          )}
          {form.action === "ASSIGN_USER" && (
            <ParticipantSelect
              id={id("assignee")}
              label="담당자"
              value={form.assigneeId}
              error={errors.assigneeId}
              participants={participants}
              onChange={(assigneeId) => set({ assigneeId })}
            />
          )}
          {form.action === "SET_PRIORITY" && (
            <Field
              id={id("priority")}
              label="바꿀 우선순위"
              error={errors.priority}
            >
              <Select
                id={id("priority")}
                value={form.priority}
                aria-invalid={!!errors.priority || undefined}
                aria-describedby={
                  errors.priority ? `${id("priority")}-error` : undefined
                }
                onChange={(event) =>
                  set({ priority: event.target.value as RuleForm["priority"] })
                }
              >
                <option value="">우선순위 선택</option>
                {priorities.map((value) => (
                  <option key={value} value={value}>
                    {priorityLabels[value]}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
        <p id={id("action-help")} className="text-xs text-muted">
          {actionHelp[form.action] ?? ""}
        </p>
      </div>
      {form.action === "CREATE_TASK" && (
        <TemplateInput
          id={id("title")}
          label="만들 업무 제목"
          value={form.titleTemplate}
          max={TITLE_TEMPLATE_MAX}
          error={errors.titleTemplate}
          variables={variables}
          onChange={(titleTemplate) => set({ titleTemplate })}
        />
      )}
      {form.action === "NOTIFY_DISCORD" && (
        <>
          {acceptsMessageTemplate(form.event) && (
            <TemplateInput
              id={id("message")}
              label="문구"
              multiline
              value={form.messageTemplate}
              max={MESSAGE_TEMPLATE_MAX}
              error={errors.messageTemplate}
              variables={variables}
              hint="쓰지 않아도 돼요. 비우면 기본 문구로 보내요. @everyone, @here, <@…>, <#…> 같은 멘션 문법은 저장할 수 없어요."
              onChange={(messageTemplate) => set({ messageTemplate })}
            />
          )}
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">멘션</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {(
                [
                  ["assignees", "담당자"],
                  ["reviewers", "리뷰어"],
                  ["pm", "PM"],
                ] as const
              )
                .filter(([key]) => !taskless || key === "pm")
                .map(([key, label]) => (
                  <span key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={id(`mention-${key}`)}
                      checked={form.mentions[key]}
                      onChange={(event) =>
                        set({
                          mentions: {
                            ...form.mentions,
                            [key]: event.target.checked,
                          },
                        })
                      }
                    />
                    <Label htmlFor={id(`mention-${key}`)}>{label}</Label>
                  </span>
                ))}
            </div>
            <p className="text-xs text-muted">
              {taskless
                ? "프로젝트 채널로 보냅니다. Discord를 연결한 사람만 멘션합니다."
                : "업무 스레드, 없으면 프로젝트 채널로 보냅니다. Discord를 연결한 사람만 멘션합니다."}
            </p>
          </fieldset>
        </>
      )}
      <span className="flex items-center gap-2">
        <Checkbox
          id={id("enabled")}
          checked={form.enabled}
          onChange={(event) => set({ enabled: event.target.checked })}
        />
        <Label htmlFor={id("enabled")}>저장하면 바로 켜기</Label>
      </span>
      <RulePreviewPanel preview={preview} stale={previewStale} />
      {change.isError && (
        <p role="alert" className="text-sm text-danger">
          {ruleErrorMessage(normalizeApiError(change.error))}
        </p>
      )}
      <div className="flex flex-wrap justify-between gap-2">
        <Button
          variant="secondary"
          loading={preview.isPending}
          disabled={change.isPending}
          onClick={runPreview}
        >
          미리보기
        </Button>
        <span className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={change.isPending}
            onClick={onClose}
          >
            취소
          </Button>
          <Button type="submit" loading={change.isPending}>
            {rule ? "저장" : "규칙 만들기"}
          </Button>
        </span>
      </div>
    </form>
  );
}

function ParticipantSelect(props: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly error?: string;
  readonly participants: readonly Option[];
  readonly onChange: (userId: string) => void;
}) {
  return (
    <Field id={props.id} label={props.label} error={props.error}>
      <Select
        id={props.id}
        value={props.value}
        aria-invalid={!!props.error || undefined}
        aria-describedby={props.error ? `${props.id}-error` : undefined}
        onChange={(event) => props.onChange(event.target.value)}
      >
        <option value="">참여자 선택</option>
        {props.participants.map((person) => (
          <option key={person.value} value={person.value}>
            {person.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/** 문구 입력 + 글자 수 + 누르면 커서 자리에 넣는 변수 칩. */
function TemplateInput(props: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly max: number;
  readonly error?: string;
  readonly hint?: string;
  readonly multiline?: boolean;
  readonly variables: readonly string[];
  readonly onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [blocked, setBlocked] = useState("");
  const left = props.max - props.value.length;
  const describedBy = [
    `${props.id}-count`,
    props.variables.length ? `${props.id}-vars` : "",
    props.hint ? `${props.id}-hint` : "",
    props.error ? `${props.id}-error` : "",
  ]
    .filter(Boolean)
    .join(" ");
  function insert(variable: string) {
    const element = ref.current;
    const text = `{${variable}}`;
    const start = element?.selectionStart ?? props.value.length;
    const end = element?.selectionEnd ?? props.value.length;
    const next = props.value.slice(0, start) + text + props.value.slice(end);
    if (next.length > props.max) {
      setBlocked(`${text}를 넣으면 ${props.max}자를 넘어서 넣지 않았어요.`);
      return;
    }
    setBlocked("");
    props.onChange(next);
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + text.length, start + text.length);
    });
  }
  const input = {
    ref,
    id: props.id,
    value: props.value,
    maxLength: props.max,
    "aria-invalid": !!props.error || undefined,
    "aria-describedby": describedBy,
    onChange: (event: { target: { value: string } }) => {
      setBlocked("");
      props.onChange(event.target.value);
    },
  };
  return (
    <Field
      id={props.id}
      label={props.label}
      error={props.error}
      hint={props.hint}
    >
      {props.multiline ? (
        <Textarea rows={3} {...input} />
      ) : (
        <Input {...input} />
      )}
      <div className="rule-template-meta">
        {props.variables.length > 0 ? (
          <span
            id={`${props.id}-vars`}
            className="rule-chips"
            role="group"
            aria-label="넣을 수 있는 변수"
          >
            {props.variables.map((variable) => (
              <button
                key={variable}
                type="button"
                className="rule-chip"
                onClick={() => insert(variable)}
              >
                {`{${variable}}`}
              </button>
            ))}
          </span>
        ) : (
          <span className="text-xs text-muted">
            이 이벤트에는 넣을 수 있는 변수가 없습니다.
          </span>
        )}
        <span
          id={`${props.id}-count`}
          className="text-xs text-muted tabular-nums"
        >
          {props.value.trim().length}/{props.max}
        </span>
      </div>
      {blocked && <p className="text-xs text-danger">{blocked}</p>}
      {/* 글자를 칠 때마다 읽지 않고, 한도에 가까워졌거나 넣지 못했을 때만 알린다. */}
      <p className="sr-only" aria-live="polite">
        {blocked || (left <= 20 ? `${left}자 남았어요.` : "")}
      </p>
    </Field>
  );
}

const previewTime: Intl.DateTimeFormatOptions = {
  year: undefined,
  hour: "2-digit",
  minute: "2-digit",
};

function previewSummary(preview: ReturnType<typeof useRulePreview>) {
  if (preview.isPending) return "";
  if (preview.isError)
    return ruleErrorMessage(normalizeApiError(preview.error));
  const data = preview.data;
  if (!data) return "";
  if (!data.supported) return "이 이벤트는 미리볼 수 없어요.";
  return `미리보기 결과 ${data.items.length}건이에요.`;
}

/** 미리보기 결과. 자리는 늘 같은 높이로 잡아 두어 결과가 와도 창이 흔들리지 않는다. */
function RulePreviewPanel({
  preview,
  stale,
}: {
  readonly preview: ReturnType<typeof useRulePreview>;
  readonly stale: boolean;
}) {
  const data = preview.data;
  let body: ReactNode;
  if (preview.isError)
    body = (
      <p className="text-sm text-danger">
        {ruleErrorMessage(normalizeApiError(preview.error))}
      </p>
    );
  else if (!data)
    body = (
      <p className="text-sm text-muted">
        {preview.isPending
          ? "지난 14일을 살펴보는 중입니다."
          : "미리보기를 누르면 지난 14일 동안 이 규칙이 걸렸을 일과 각 동작의 예상 결과를 보여 줍니다. 저장하거나 보내는 것은 없습니다."}
      </p>
    );
  else if (!data.supported)
    body = (
      <p className="text-sm text-muted">
        이 이벤트는 지난 기록이 남지 않아 미리볼 수 없어요. 저장한 뒤 실행
        기록에서 결과를 확인하세요.
      </p>
    );
  else if (data.items.length === 0)
    body = (
      <p className="text-sm text-muted">
        {formatDate(data.since, previewTime)} 이후 이 규칙이 걸렸을 일이
        없습니다.
      </p>
    );
  else
    body = (
      <>
        <p className="text-xs text-muted">
          {formatDate(data.since, previewTime)} 이후 {data.items.length}건
          {data.truncated ? "(최근 50건만 보여 줍니다)" : ""}. 조건은 지금 업무
          상태로 판단한 예상입니다.
        </p>
        <ul className="rule-preview-list" aria-label="미리보기 결과">
          {data.items.map((item, index) => (
            <li
              key={`${item.occurredAt}-${item.task?.id ?? item.subject}-${index}`}
              className="rule-preview-item"
            >
              <time
                dateTime={item.occurredAt}
                className="text-xs text-muted tabular-nums"
              >
                {formatDate(item.occurredAt, previewTime)}
              </time>
              <div className="min-w-0">
                <p className="truncate text-sm">{item.subject}</p>
                <p className="text-xs text-muted">{item.detail}</p>
                {resultMessage(
                  item.resultCode,
                  item.status,
                  item.event,
                  item.action,
                ) && (
                  <p
                    className={`text-xs ${item.status === "FAILED" ? "text-danger" : "text-muted"}`}
                  >
                    {resultMessage(
                      item.resultCode,
                      item.status,
                      item.event,
                      item.action,
                    )}
                  </p>
                )}
              </div>
              <span className="text-xs">
                <RunStatus status={item.status} /> 예상
              </span>
            </li>
          ))}
        </ul>
      </>
    );
  return (
    <section
      className="rule-preview"
      aria-label="미리보기"
      aria-busy={preview.isPending || undefined}
      data-stale={stale || undefined}
    >
      {stale && !preview.isPending && (
        <p className="text-xs text-muted">
          규칙을 바꿨습니다. 다시 미리보기를 누르면 새로 살펴봅니다.
        </p>
      )}
      {body}
      {/* 결과 목록 전체 대신 한 줄 요약만 읽는다. */}
      <p className="sr-only" aria-live="polite">
        {previewSummary(preview)}
      </p>
    </section>
  );
}
