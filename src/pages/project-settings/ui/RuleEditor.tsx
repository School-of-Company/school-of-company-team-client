"use client";

import { useState } from "react";
import type { PlanningBucket, ProjectDetail } from "@/entities/project";
import {
  priorityLabels,
  statusLabels,
  type TaskPriority,
} from "@/entities/task";
import { normalizeApiError } from "@/shared/api";
import {
  Button,
  Checkbox,
  Dialog,
  Field,
  Input,
  Label,
  Select,
} from "@/shared/ui";
import {
  actionLabels,
  allowedActions,
  changeEvent,
  conditionFields,
  conditionValueLabel,
  emptyRuleForm,
  eventLabels,
  eventStatusOptions,
  fieldLabels,
  formToRequest,
  ruleErrorMessage,
  ruleToForm,
  selectableEvents,
  typeLabels,
  validateRuleForm,
  type AutomationRule,
  type RuleAction,
  type RuleConditionField,
  type RuleEvent,
  type RuleForm,
  type RuleFormErrors,
} from "../model/rule";
import { useRuleChange } from "../api/rules";

type Option = { readonly value: string; readonly label: string };

/** 규칙 생성·편집 창. `rule` 이 없으면 새 규칙이다. 열 때마다 폼을 새로 그려 이전 입력이 남지 않는다. */
export function RuleEditor(props: {
  readonly open: boolean;
  readonly project: ProjectDetail;
  readonly buckets: readonly PlanningBucket[];
  readonly reviewers: readonly Option[];
  readonly rule: AutomationRule | null;
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
          key={props.rule?.id ?? "new"}
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
  reviewers,
  rule,
  change,
  onClose,
}: {
  readonly project: ProjectDetail;
  readonly buckets: readonly PlanningBucket[];
  readonly reviewers: readonly Option[];
  readonly rule: AutomationRule | null;
  readonly change: ReturnType<typeof useRuleChange>;
  readonly onClose: () => void;
}) {
  const [form, setForm] = useState<RuleForm>(() =>
    rule ? ruleToForm(rule) : emptyRuleForm(),
  );
  const [errors, setErrors] = useState<RuleFormErrors>({});
  const set = (patch: Partial<RuleForm>) =>
    setForm((current) => ({ ...current, ...patch }));
  const incident = form.event === "INCIDENT_CREATED";
  const options: Readonly<Record<RuleConditionField, readonly Option[]>> = {
    PRIORITY: (Object.keys(priorityLabels) as TaskPriority[]).map((value) => ({
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
  function submit() {
    if (change.isPending) return;
    const found = validateRuleForm(form);
    setErrors(found);
    if (Object.keys(found).length) return;
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
      <div className="rule-form-row">
        <Field id={id("event")} label="언제">
          <Select
            id={id("event")}
            value={form.event}
            aria-describedby={incident ? id("incident-note") : undefined}
            onChange={(event) =>
              setForm((current) =>
                changeEvent(current, event.target.value as RuleEvent),
              )
            }
          >
            {selectableEvents.map((value) => (
              <option key={value} value={value}>
                {eventLabels[value]}
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
      </div>
      {incident && (
        <p id={id("incident-note")} className="text-xs text-muted">
          사고의 영향 서비스가 이 프로젝트에 연결된 저장소를 쓰면 걸립니다.
        </p>
      )}
      {!incident && (
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
      <div className="rule-form-row">
        <Field id={id("action")} label="동작">
          <Select
            id={id("action")}
            value={form.action}
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
          <Field
            id={id("reviewer")}
            label="리뷰어"
            error={errors.reviewerId}
            hint="개발 업무에만 지정됩니다."
          >
            <Select
              id={id("reviewer")}
              value={form.reviewerId}
              aria-invalid={!!errors.reviewerId || undefined}
              onChange={(event) => set({ reviewerId: event.target.value })}
            >
              <option value="">참여자 선택</option>
              {reviewers.map((person) => (
                <option key={person.value} value={person.value}>
                  {person.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      {form.action === "NOTIFY_DISCORD" && (
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
              .filter(([key]) => !incident || key === "pm")
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
            {incident
              ? "프로젝트 채널로 보냅니다. Discord를 연결한 사람만 멘션합니다."
              : "업무 스레드, 없으면 프로젝트 채널로 보냅니다. Discord를 연결한 사람만 멘션합니다."}
          </p>
        </fieldset>
      )}
      <span className="flex items-center gap-2">
        <Checkbox
          id={id("enabled")}
          checked={form.enabled}
          onChange={(event) => set({ enabled: event.target.checked })}
        />
        <Label htmlFor={id("enabled")}>저장하면 바로 켜기</Label>
      </span>
      {change.isError && (
        <p role="alert" className="text-sm text-danger">
          {ruleErrorMessage(normalizeApiError(change.error))}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
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
      </div>
    </form>
  );
}
