"use client";

import { useRef, useState, type ReactNode } from "react";
import type { PlanningBucket } from "@/entities/project";
import {
  priorityLabels,
  sizeLabels,
  statusLabels,
  taskSizes,
  taskStatuses,
  type TaskPriority,
} from "@/entities/task";
import { normalizeApiError } from "@/shared/api";
import { formatDate } from "@/shared/lib";
import {
  Button,
  Checkbox,
  CopyField,
  Dialog,
  Field,
  InfoTip,
  Input,
  Label,
  SegmentedRadio,
  Select,
  Textarea,
} from "@/shared/ui";
import {
  actionHelp,
  actionLabels,
  allowedActions,
  BOOLEAN_FIELDS,
  changeEvent,
  conditionValueLabel,
  dayLabels,
  daysOfWeek,
  emptyRuleForm,
  ESCALATION_MAX_HOURS,
  ESCALATION_MAX_STEPS,
  escalationTargetLabels,
  escalationTargets,
  eventHelp,
  eventLabel,
  eventStatusOptions,
  fieldLabels,
  formToRequest,
  isTasklessEvent,
  MESSAGE_TEMPLATE_MAX,
  resultMessage,
  ruleErrorMessage,
  ruleToForm,
  scopeConditionFields,
  selectableEvents,
  templateVariables,
  TITLE_TEMPLATE_MAX,
  typeLabels,
  UNASSIGNED_VALUE,
  usesMentions,
  usesMessageTemplate,
  usesTitleTemplate,
  validateRuleForm,
  WEBHOOK_URL_MAX,
  type AutomationRule,
  type RuleAction,
  type RuleConditionField,
  type RuleEvent,
  type RuleForm,
  type RuleFormErrors,
} from "../model/rule";
import {
  useRotateWebhookSecret,
  useRuleChange,
  useRulePreview,
  type RuleTarget,
} from "../api/rules";
import { RunStatus } from "./RuleRuns";

type Option = { readonly value: string; readonly label: string };

/** 편집기가 고를 수 있는 값. 프로젝트 규칙은 그 프로젝트의 값, 팀 규칙은 조직 전체 값이다. */
export type RuleEditorContext = {
  readonly target: RuleTarget;
  /** 프로젝트 규칙만: 파트, 버킷, 끝나지 않은 스프린트. */
  readonly parts: readonly Option[];
  readonly buckets: readonly PlanningBucket[];
  readonly sprints: readonly Option[];
  /** 리뷰어·담당자·담당자 조건·DM 받을 사람 후보(활성 사용자). */
  readonly people: readonly Option[];
  /** 팀 규칙만: 프로젝트 필터와 미리볼 프로젝트. */
  readonly projects: readonly Option[];
};

/** 서명 확인 방법(서버 runbook 14절). */
const WEBHOOK_RUNBOOK_URL =
  "https://github.com/School-of-Company/school-of-company-team-server/blob/main/docs/ops/runbook.md#14-%EC%9E%90%EB%8F%99%ED%99%94-%EC%9B%B9%ED%9B%85--n8n";

const priorities = Object.keys(priorityLabels) as TaskPriority[];
const hours = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * 규칙 생성·편집 창. `rule` 이 없으면 새 규칙이고, `initial`(템플릿)이 있으면 그 값으로 채운다.
 * 열 때마다 폼을 새로 그려 이전 입력이 남지 않는다. 웹훅 비밀값이 오면 폼 대신 한 번만 보여 준다.
 */
export function RuleEditor(props: {
  readonly open: boolean;
  readonly context: RuleEditorContext;
  readonly rule: AutomationRule | null;
  readonly initial?: RuleForm;
  readonly onClose: () => void;
}) {
  const change = useRuleChange(props.context.target);
  // 비밀값은 이 창의 상태로만 둔다. 닫으면 사라지고 다시 볼 수 없다.
  const [secret, setSecret] = useState<string | null>(null);
  const close = () => {
    if (change.isPending) return;
    change.reset();
    setSecret(null);
    props.onClose();
  };
  return (
    <Dialog
      open={props.open}
      onClose={close}
      title={secret ? "웹훅 비밀값" : props.rule ? "규칙 편집" : "새 규칙"}
      className="rule-dialog"
    >
      {props.open &&
        (secret ? (
          <WebhookSecretPanel secret={secret} onClose={close} />
        ) : (
          <RuleEditorForm
            key={props.rule?.id ?? props.initial?.name ?? "new"}
            {...props}
            change={change}
            onSecret={setSecret}
            onClose={close}
          />
        ))}
    </Dialog>
  );
}

/** 비밀값은 한 번만 보인다. 복사 버튼, 되돌릴 수 없다는 경고, 서명 확인 방법을 함께 둔다. */
function WebhookSecretPanel({
  secret,
  onClose,
}: {
  readonly secret: string;
  readonly onClose: () => void;
}) {
  return (
    <div className="grid gap-4">
      <CopyField id="rule-webhook-secret" label="비밀값" value={secret} />
      <p role="alert" className="text-sm text-danger">
        이 창을 닫으면 다시 볼 수 없어요. 지금 복사해서 받는 쪽에 넣어 두세요.
      </p>
      <WebhookSignatureNote />
      <div className="flex justify-end">
        <Button onClick={onClose}>복사했어요</Button>
      </div>
    </div>
  );
}

function WebhookSignatureNote() {
  return (
    <div className="flex items-center gap-1 text-sm text-muted">
      받는 쪽에서 서명을 확인하세요.
      <InfoTip label="웹훅 서명 확인 방법">
        <span className="grid gap-2">
          <span>
            요청마다 X-Hub-Timestamp와 X-Hub-Signature-256 헤더가 붙어요. 서명은
            비밀값으로 만든 HMAC-SHA256(timestamp.본문)이에요.
          </span>
          <span>
            받은 원문 본문으로 다시 계산해 비교하고, 5분이 지난 요청은 버리세요.
            같은 X-Hub-Delivery는 한 번만 처리하세요.
          </span>
          <a
            href={WEBHOOK_RUNBOOK_URL}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            n8n 설정 방법
          </a>
        </span>
      </InfoTip>
    </div>
  );
}

function RuleEditorForm({
  context,
  rule,
  initial,
  change,
  onSecret,
  onClose,
}: {
  readonly context: RuleEditorContext;
  readonly rule: AutomationRule | null;
  readonly initial?: RuleForm;
  readonly change: ReturnType<typeof useRuleChange>;
  readonly onSecret: (secret: string) => void;
  readonly onClose: () => void;
}) {
  const scope = context.target.scope;
  const team = scope === "TEAM";
  const [form, setForm] = useState<RuleForm>(
    () => initial ?? (rule ? ruleToForm(rule) : emptyRuleForm()),
  );
  const [errors, setErrors] = useState<RuleFormErrors>({});
  const preview = useRulePreview(context.target);
  const [previewProject, setPreviewProject] = useState(
    () => form.projectIds[0] ?? context.projects[0]?.value ?? "",
  );
  // 미리보기를 보낸 본문. 폼이 바뀌면 결과가 지난 것임을 알린다.
  const [previewed, setPreviewed] = useState("");
  const set = (patch: Partial<RuleForm>) =>
    setForm((current) => ({ ...current, ...patch }));
  const taskless = isTasklessEvent(form.event);
  const variables = templateVariables(form.event);
  const action = form.action;
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
    SIZE: taskSizes.map((value) => ({ value, label: sizeLabels[value] })),
    PART: context.parts,
    // 보관된 버킷도 조건으로는 쓸 수 있다(이미 들어 있는 업무가 있다).
    BUCKET: context.buckets.map((bucket) => ({
      value: bucket.id,
      label: bucket.archived ? `${bucket.name}, 보관됨` : bucket.name,
    })),
    UNASSIGNED: [{ value: UNASSIGNED_VALUE, label: "담당자 없음" }],
    ASSIGNEE: context.people,
    SPRINT: ["true", "false"].map((value) => ({
      value,
      label: conditionValueLabel("SPRINT", value, null),
    })),
    DEADLINE: ["true", "false"].map((value) => ({
      value,
      label: conditionValueLabel("DEADLINE", value, null),
    })),
  };
  // 담당자 없음은 담당자 줄의 첫 칩이다. 둘은 함께 맞을 수 없어 서로 비운다.
  const rows = scopeConditionFields(scope).filter(
    (field) => field !== "UNASSIGNED",
  );
  const activeBuckets = context.buckets.filter((bucket) => !bucket.archived);
  const id = (name: string) => `rule-${rule?.id ?? "new"}-${name}`;
  const savedWebhook =
    !!rule && rule.action === "WEBHOOK" && action === "WEBHOOK";

  function toggleCondition(field: RuleConditionField, value: string) {
    const current = form.conditions[field];
    const on = current.includes(value);
    const next = { ...form.conditions };
    if (BOOLEAN_FIELDS.includes(field)) next[field] = on ? [] : [value];
    else
      next[field] = on
        ? current.filter((item) => item !== value)
        : [...current, value];
    if (!on && field === "UNASSIGNED") next.ASSIGNEE = [];
    if (!on && field === "ASSIGNEE") next.UNASSIGNED = [];
    set({ conditions: next });
  }
  function check() {
    const found = validateRuleForm(form, scope);
    setErrors(found);
    return Object.keys(found).length === 0;
  }
  function submit() {
    if (change.isPending || !check()) return;
    const body = formToRequest(form, scope);
    change.mutate(
      rule
        ? { kind: "update", ruleId: rule.id, body }
        : { kind: "create", body },
      {
        onSuccess: (result) => {
          // 결과(비밀값 포함)를 뮤테이션 상태에 남기지 않는다.
          change.reset();
          if (result?.secret) onSecret(result.secret);
          else onClose();
        },
      },
    );
  }
  function runPreview() {
    if (preview.isPending || !check()) return;
    const body = formToRequest(form, scope);
    setPreviewed(JSON.stringify([body, previewProject]));
    preview.mutate({ body, projectId: previewProject || undefined });
  }
  const previewStale =
    !!previewed &&
    previewed !== JSON.stringify([formToRequest(form, scope), previewProject]);

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
      {team && (
        <ChipGroup
          id={id("projects")}
          label="프로젝트"
          tip="고르지 않으면 아카이브가 아닌 모든 프로젝트에 걸려요. 서비스, 배포, 장애 이벤트는 여러 프로젝트에 연결돼 있어도 한 번만 실행해요."
          options={context.projects}
          empty="프로젝트가 없어요."
          selected={form.projectIds}
          onToggle={(value) =>
            set({
              projectIds: form.projectIds.includes(value)
                ? form.projectIds.filter((item) => item !== value)
                : [...form.projectIds, value],
            })
          }
        />
      )}
      <div className="grid gap-2">
        <div className="rule-form-row">
          <Field id={id("event")} label="언제">
            <Select
              id={id("event")}
              value={form.event}
              aria-describedby={id("event-help")}
              onChange={(event) =>
                setForm((current) =>
                  changeEvent(current, event.target.value as RuleEvent, scope),
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
        <fieldset
          className="grid gap-3"
          aria-describedby={
            errors.conditions ? id("conditions-error") : undefined
          }
        >
          <legend className="flex items-center gap-1 text-sm font-medium">
            조건
            <InfoTip label="조건 설명">
              비우면 모든 업무에 걸려요. 한 줄 안에서는 하나만 맞으면 되고,
              줄끼리는 모두 맞아야 해요.
            </InfoTip>
          </legend>
          {rows.map((field) => {
            const chipFields: readonly RuleConditionField[] =
              field === "ASSIGNEE" ? ["UNASSIGNED", "ASSIGNEE"] : [field];
            const chips = chipFields.flatMap((chipField) => {
              const known = new Set(
                options[chipField].map((item) => item.value),
              );
              // 지워진 파트·버킷·사용자 조건도 보여 줘야 뺄 수 있다.
              const missing = form.conditions[chipField].filter(
                (value) => !known.has(value),
              );
              return [
                ...options[chipField],
                ...missing.map((value) => ({
                  value,
                  label: conditionValueLabel(chipField, value, null),
                })),
              ].map((chip) => ({ ...chip, field: chipField }));
            });
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
                        key={`${chip.field}-${chip.value}`}
                        type="button"
                        className="rule-chip"
                        aria-pressed={form.conditions[chip.field].includes(
                          chip.value,
                        )}
                        onClick={() => toggleCondition(chip.field, chip.value)}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </span>
                )}
              </div>
            );
          })}
          {errors.conditions && (
            <p
              id={id("conditions-error")}
              role="alert"
              className="text-sm text-danger"
            >
              {errors.conditions}
            </p>
          )}
        </fieldset>
      )}
      <div className="grid gap-2">
        <div className="rule-form-row">
          <Field id={id("action")} label="동작">
            <Select
              id={id("action")}
              value={action}
              aria-describedby={id("action-help")}
              onChange={(event) =>
                set({ action: event.target.value as RuleAction })
              }
            >
              {allowedActions(form.event, scope).map((value) => (
                <option key={value} value={value}>
                  {actionLabels[value]}
                </option>
              ))}
            </Select>
          </Field>
          {action === "MOVE_BUCKET" && (
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
          {action === "ASSIGN_REVIEWER" && (
            <ParticipantSelect
              id={id("reviewer")}
              label="리뷰어"
              value={form.reviewerId}
              error={errors.reviewerId}
              participants={context.people}
              onChange={(reviewerId) => set({ reviewerId })}
            />
          )}
          {action === "ASSIGN_USER" && (
            <ParticipantSelect
              id={id("assignee")}
              label="담당자"
              value={form.assigneeId}
              error={errors.assigneeId}
              participants={context.people}
              onChange={(assigneeId) => set({ assigneeId })}
            />
          )}
          {action === "SET_PRIORITY" && (
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
          {action === "MOVE_STATUS" && (
            <Field
              id={id("move-status")}
              label="옮길 상태"
              error={errors.status}
            >
              <Select
                id={id("move-status")}
                value={form.status}
                aria-invalid={!!errors.status || undefined}
                aria-describedby={
                  errors.status ? `${id("move-status")}-error` : undefined
                }
                onChange={(event) =>
                  set({ status: event.target.value as RuleForm["status"] })
                }
              >
                <option value="">상태 선택</option>
                {taskStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {action === "ADD_TO_SPRINT" && !team && (
            <Field id={id("sprint")} label="스프린트">
              <Select
                id={id("sprint")}
                value={form.sprintId}
                onChange={(event) => set({ sprintId: event.target.value })}
              >
                <option value="">진행 중 스프린트</option>
                {context.sprints.map((sprint) => (
                  <option key={sprint.value} value={sprint.value}>
                    {sprint.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {(action === "SET_DEADLINE" || action === "ASSIGN_TO_AGENT") && (
            <Field
              id={id("days")}
              label={action === "SET_DEADLINE" ? "오늘부터 일수" : "기한 일수"}
              hint={
                action === "SET_DEADLINE"
                  ? "0은 오늘이에요. 365일까지 정할 수 있어요."
                  : "비우면 기한 없이 넣어요. 30일까지 정할 수 있어요."
              }
              error={errors.days}
            >
              <Input
                id={id("days")}
                type="number"
                inputMode="numeric"
                min={action === "SET_DEADLINE" ? 0 : 1}
                max={action === "SET_DEADLINE" ? 365 : 30}
                step={1}
                value={form.days}
                aria-invalid={!!errors.days || undefined}
                aria-describedby={[
                  `${id("days")}-hint`,
                  errors.days ? `${id("days")}-error` : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onChange={(event) => set({ days: event.target.value })}
              />
            </Field>
          )}
        </div>
        <p id={id("action-help")} className="text-xs text-muted">
          {actionHelp[action] ?? ""}
        </p>
      </div>
      {usesTitleTemplate(action) && (
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
      {usesMessageTemplate(action, form.event) && (
        <TemplateInput
          id={id("message")}
          label={messageLabel(action)}
          multiline
          value={form.messageTemplate}
          max={MESSAGE_TEMPLATE_MAX}
          error={errors.messageTemplate}
          variables={variables}
          hint={
            action === "ADD_COMMENT"
              ? "@everyone, @here, <@…>, <#…> 같은 멘션 문법은 저장할 수 없어요."
              : "쓰지 않아도 돼요. 비우면 기본 문구로 보내요. @everyone, @here, <@…>, <#…> 같은 멘션 문법은 저장할 수 없어요."
          }
          onChange={(messageTemplate) => set({ messageTemplate })}
        />
      )}
      {usesMentions(action) && (
        <fieldset
          className="grid gap-2"
          aria-describedby={errors.dmUserId ? id("dm-error") : undefined}
        >
          <legend className="text-sm font-medium">
            {action === "DISCORD_DM" ? "받는 사람" : "멘션"}
          </legend>
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
          {action === "DISCORD_DM" && (
            <ParticipantSelect
              id={id("dm-user")}
              label="함께 받을 사람"
              placeholder="없음"
              value={form.dmUserId}
              participants={context.people}
              onChange={(dmUserId) => set({ dmUserId })}
            />
          )}
          {errors.dmUserId && (
            <p id={id("dm-error")} role="alert" className="text-sm text-danger">
              {errors.dmUserId}
            </p>
          )}
          <p className="text-xs text-muted">
            {action === "DISCORD_DM"
              ? "Discord를 연결했고 지금 이 업무를 볼 수 있는 사람에게만 보내요."
              : taskless
                ? "Discord를 연결한 사람만 멘션합니다."
                : "업무 스레드, 없으면 고른 채널로 보냅니다. Discord를 연결한 사람만 멘션합니다."}
          </p>
        </fieldset>
      )}
      {action === "NOTIFY_DISCORD" && (
        <div className="rule-form-row">
          <div className="grid gap-2">
            <span className="flex items-center gap-1 text-sm font-medium">
              채널
              <InfoTip label="팀 채널 설명">
                참여자에게만 공개된 프로젝트의 업무는 팀 채널에 올리지 않아요.
              </InfoTip>
            </span>
            <SegmentedRadio
              name={id("channel")}
              label="채널"
              value={form.channel}
              disabled={false}
              options={[
                { value: "PROJECT", label: "프로젝트" },
                { value: "TEAM", label: "팀" },
              ]}
              onChange={(channel) => set({ channel })}
            />
          </div>
          <Field id={id("digest")} label="보내는 때">
            <Select
              id={id("digest")}
              value={form.digestHour}
              onChange={(event) =>
                set({
                  digestHour:
                    event.target.value === "" ? "" : Number(event.target.value),
                })
              }
            >
              <option value="">바로</option>
              {hours.map((hour) => (
                <option key={hour} value={hour}>
                  매일 {hour}시에 모아서
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
      {action === "WEBHOOK" && (
        <div className="grid gap-2">
          <Field id={id("webhook")} label="보낼 주소" error={errors.webhookUrl}>
            <Input
              id={id("webhook")}
              type="url"
              inputMode="url"
              spellCheck={false}
              placeholder="https://n8n.example.com/webhook/hub"
              value={form.webhookUrl}
              maxLength={WEBHOOK_URL_MAX}
              aria-invalid={!!errors.webhookUrl || undefined}
              aria-describedby={
                errors.webhookUrl ? `${id("webhook")}-error` : undefined
              }
              onChange={(event) => set({ webhookUrl: event.target.value })}
            />
          </Field>
          <p className="text-xs text-muted">
            {savedWebhook
              ? "비밀값은 만들 때 한 번만 보여요. 잃어버렸으면 다시 만드세요."
              : "저장하면 서명용 비밀값을 한 번만 보여 줘요."}
          </p>
          <WebhookSignatureNote />
          {savedWebhook && rule && (
            <RotateWebhookSecret
              target={context.target}
              ruleId={rule.id}
              onSecret={onSecret}
            />
          )}
        </div>
      )}
      {action === "ESCALATE" && (
        <EscalationSteps
          id={id("escalation")}
          form={form}
          error={errors.escalation}
          onChange={(escalation) => set({ escalation })}
        />
      )}
      <span className="flex items-center gap-2">
        <Checkbox
          id={id("enabled")}
          checked={form.enabled}
          onChange={(event) => set({ enabled: event.target.checked })}
        />
        <Label htmlFor={id("enabled")}>저장하면 바로 켜기</Label>
      </span>
      {rule?.disabledReason && form.enabled && !rule.enabled && (
        <p className="text-xs text-muted">
          켜서 저장하면 연속 실패 수와 자동으로 꺼진 이유가 지워져요.
        </p>
      )}
      <RulePreviewPanel preview={preview} stale={previewStale} />
      {change.isError && (
        <p role="alert" className="text-sm text-danger">
          {ruleErrorMessage(normalizeApiError(change.error))}
        </p>
      )}
      <div className="flex flex-wrap justify-between gap-2">
        <span className="flex flex-wrap items-center gap-2">
          {team && (
            <Select
              aria-label="미리볼 프로젝트"
              className="rule-hour"
              value={previewProject}
              onChange={(event) => setPreviewProject(event.target.value)}
            >
              {context.projects.map((project) => (
                <option key={project.value} value={project.value}>
                  {project.label}
                </option>
              ))}
            </Select>
          )}
          <Button
            variant="secondary"
            loading={preview.isPending}
            disabled={change.isPending || (team && !previewProject)}
            onClick={runPreview}
          >
            미리보기
          </Button>
        </span>
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

function messageLabel(action: RuleAction) {
  if (action === "ADD_COMMENT") return "댓글";
  if (action === "ASSIGN_TO_AGENT") return "에이전트에게 남길 메모";
  if (action === "ADD_INCIDENT_NOTE") return "메모";
  return "문구";
}

/** 누르면 고르고 다시 누르면 빼는 칩 묶음. 설명은 InfoTip 에 둔다. */
function ChipGroup(props: {
  readonly id: string;
  readonly label: string;
  readonly tip: string;
  readonly options: readonly Option[];
  readonly empty: string;
  readonly selected: readonly string[];
  readonly onToggle: (value: string) => void;
}) {
  return (
    <div role="group" aria-labelledby={props.id} className="grid gap-2">
      <span
        id={props.id}
        className="flex items-center gap-1 text-sm font-medium"
      >
        {props.label}
        <InfoTip label={`${props.label} 설명`}>{props.tip}</InfoTip>
      </span>
      {props.options.length === 0 ? (
        <span className="text-xs text-muted">{props.empty}</span>
      ) : (
        <span className="rule-chips">
          {props.options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="rule-chip"
              aria-pressed={props.selected.includes(option.value)}
              onClick={() => props.onToggle(option.value)}
            >
              {option.label}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}

/** 에스컬레이션 단계 1~3개. 시간은 시작부터 센다. */
function EscalationSteps({
  id,
  form,
  error,
  onChange,
}: {
  readonly id: string;
  readonly form: RuleForm;
  readonly error?: string;
  readonly onChange: (steps: RuleForm["escalation"]) => void;
}) {
  const steps = form.escalation;
  const targets = escalationTargets(form.event);
  const update = (index: number, patch: Partial<(typeof steps)[number]>) =>
    onChange(
      steps.map((step, at) => (at === index ? { ...step, ...patch } : step)),
    );
  return (
    <fieldset
      className="grid gap-2"
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <legend className="flex items-center gap-1 text-sm font-medium">
        단계
        <InfoTip label="에스컬레이션 설명">
          시작부터 정한 시간이 지나도 풀리지 않으면 그 단계 사람에게 DM을
          보내요. 막힘이 풀리거나 상태가 바뀌거나 장애가 완화되면 멈춰요.
        </InfoTip>
      </legend>
      <ol className="grid gap-2">
        {steps.map((step, index) => (
          <li key={index} className="rule-schedule">
            <span className="text-sm tabular-nums">{index + 1}단계</span>
            <Input
              aria-label={`${index + 1}단계 시간`}
              className="rule-hour"
              type="number"
              inputMode="numeric"
              min={1}
              max={ESCALATION_MAX_HOURS}
              step={1}
              value={step.afterHours}
              aria-invalid={!!error || undefined}
              onChange={(event) =>
                update(index, { afterHours: event.target.value })
              }
            />
            <span className="text-sm">시간 뒤</span>
            <Select
              aria-label={`${index + 1}단계 받는 사람`}
              className="rule-hour"
              value={step.notify}
              onChange={(event) =>
                update(index, {
                  notify: event.target.value as (typeof step)["notify"],
                })
              }
            >
              {/* 이벤트를 바꿔 맞지 않게 된 값도 보여야 고칠 수 있다. */}
              {[...new Set([...targets, step.notify])].map((target) => (
                <option key={target} value={target}>
                  {escalationTargetLabels[target]}
                </option>
              ))}
            </Select>
            {steps.length > 1 && (
              <Button
                variant="ghost"
                className="ui-button-sm"
                aria-label={`${index + 1}단계 빼기`}
                onClick={() => onChange(steps.filter((_, at) => at !== index))}
              >
                빼기
              </Button>
            )}
          </li>
        ))}
      </ol>
      {steps.length < ESCALATION_MAX_STEPS && (
        <Button
          variant="secondary"
          className="ui-button-sm justify-self-start"
          onClick={() => {
            const last = Number(steps.at(-1)?.afterHours) || 0;
            onChange([
              ...steps,
              {
                afterHours: String(
                  Math.min(last * 2 || 4, ESCALATION_MAX_HOURS),
                ),
                notify: targets.at(-1) ?? "LEAD",
              },
            ]);
          }}
        >
          단계 추가
        </Button>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** 비밀값 재발급. 지금 값이 바로 무효가 되므로 한 번 더 묻는다. */
function RotateWebhookSecret({
  target,
  ruleId,
  onSecret,
}: {
  readonly target: RuleTarget;
  readonly ruleId: string;
  readonly onSecret: (secret: string) => void;
}) {
  const rotate = useRotateWebhookSecret(target);
  const [confirming, setConfirming] = useState(false);
  if (!confirming)
    return (
      <Button
        variant="secondary"
        className="ui-button-sm justify-self-start"
        onClick={() => setConfirming(true)}
      >
        비밀값 다시 만들기
      </Button>
    );
  return (
    <div className="grid gap-2">
      <p role="alert" className="text-sm text-danger">
        다시 만들면 지금 비밀값은 바로 쓸 수 없어요. 받는 쪽도 새 값으로 바꿔야
        해요.
      </p>
      {rotate.isError && (
        <p role="alert" className="text-sm text-danger">
          {ruleErrorMessage(normalizeApiError(rotate.error))}
        </p>
      )}
      <span className="flex flex-wrap gap-2">
        <Button
          variant="danger"
          className="ui-button-sm"
          loading={rotate.isPending}
          onClick={() =>
            rotate.mutate(ruleId, {
              onSuccess: (secret) => {
                rotate.reset();
                onSecret(secret);
              },
            })
          }
        >
          다시 만들기
        </Button>
        <Button
          variant="ghost"
          className="ui-button-sm"
          disabled={rotate.isPending}
          onClick={() => setConfirming(false)}
        >
          취소
        </Button>
      </span>
    </div>
  );
}
function ParticipantSelect(props: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly error?: string;
  readonly placeholder?: string;
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
        <option value="">{props.placeholder ?? "사람 선택"}</option>
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
