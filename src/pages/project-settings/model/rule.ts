import {
  priorityLabels,
  statusLabels,
  taskStatuses,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from "@/entities/task";

// 계약: 서버 docs/spec/s8-rules-search.md 3·4절. 상태를 바꾸는 동작·외부 저장소 쓰기 동작은 서버 enum 에도 없다.
export type RuleEvent =
  | "TASK_STATUS_CHANGED"
  | "TASK_BLOCKED"
  | "CI_FAILED"
  | "REVIEW_REQUESTED"
  | "DEADLINE_APPROACHING"
  | "INCIDENT_CREATED";
export type RuleAction =
  "NOTIFY_DISCORD" | "MARK_ATTENTION" | "ASSIGN_REVIEWER" | "MOVE_BUCKET";
export type RuleConditionField = "PRIORITY" | "TYPE" | "PART" | "BUCKET";
export type RuleRunStatus =
  "PENDING" | "SENDING" | "SUCCEEDED" | "SKIPPED" | "FAILED";
export type RuleMentions = {
  readonly assignees: boolean;
  readonly reviewers: boolean;
  readonly pm: boolean;
};

export type AutomationRule = {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly event: RuleEvent;
  readonly eventStatus: TaskStatus | null;
  readonly conditions: readonly {
    readonly field: RuleConditionField;
    readonly value: string;
    /** 파트·버킷이 지워졌으면 null. 그 조건은 어떤 업무와도 맞지 않는다. */
    readonly label: string | null;
  }[];
  readonly action: RuleAction;
  readonly bucket: { readonly id: string; readonly name: string } | null;
  readonly reviewer: { readonly id: string; readonly name: string } | null;
  readonly mentions: RuleMentions | null;
  readonly lastRun: {
    readonly status: RuleRunStatus;
    readonly resultCode: string | null;
    readonly createdAt: string;
  } | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type RuleRun = {
  readonly id: string;
  readonly ruleId: string;
  readonly ruleName: string;
  readonly event: RuleEvent;
  readonly task: {
    readonly id: string;
    readonly key: string;
    readonly title: string;
  } | null;
  readonly incidentId: string | null;
  readonly status: RuleRunStatus;
  readonly resultCode: string | null;
  readonly attempts: number;
  readonly createdAt: string;
  readonly finishedAt: string | null;
};
export type RuleRunPage = {
  readonly items: readonly RuleRun[];
  readonly nextBefore: string | null;
};

export type SaveRuleRequest = {
  readonly name: string;
  readonly enabled: boolean;
  readonly event: RuleEvent;
  readonly eventStatus: TaskStatus | null;
  readonly conditions: readonly {
    readonly field: RuleConditionField;
    readonly value: string;
  }[];
  readonly action: RuleAction;
  readonly bucketId: string | null;
  readonly reviewerId: string | null;
  readonly mentions: RuleMentions | null;
};

export const eventLabels: Readonly<Record<RuleEvent, string>> = {
  TASK_STATUS_CHANGED: "상태가 바뀔 때",
  TASK_BLOCKED: "막힘으로 표시될 때",
  CI_FAILED: "연결된 PR의 CI가 실패할 때",
  REVIEW_REQUESTED: "연결된 PR에 리뷰가 요청될 때",
  DEADLINE_APPROACHING: "마감 하루 전",
  INCIDENT_CREATED: "장애가 생길 때",
};
/** 업무 이벤트 다음에 사고 이벤트. 사고 이벤트는 업무 필드가 없어 조건을 두지 않는다. */
export const selectableEvents: readonly RuleEvent[] = [
  "TASK_STATUS_CHANGED",
  "TASK_BLOCKED",
  "CI_FAILED",
  "REVIEW_REQUESTED",
  "DEADLINE_APPROACHING",
  "INCIDENT_CREATED",
];
export const actionLabels: Readonly<Record<RuleAction, string>> = {
  NOTIFY_DISCORD: "Discord로 알림",
  MARK_ATTENTION: "확인 필요로 표시",
  ASSIGN_REVIEWER: "리뷰어 지정",
  MOVE_BUCKET: "버킷으로 옮기기",
};
export const actions = Object.keys(actionLabels) as readonly RuleAction[];
export const fieldLabels: Readonly<Record<RuleConditionField, string>> = {
  PRIORITY: "우선순위",
  TYPE: "유형",
  PART: "파트",
  BUCKET: "버킷",
};
export const conditionFields = Object.keys(
  fieldLabels,
) as readonly RuleConditionField[];
export const runStatusLabels: Readonly<Record<RuleRunStatus, string>> = {
  PENDING: "대기",
  SENDING: "보내는 중",
  SUCCEEDED: "성공",
  SKIPPED: "건너뜀",
  FAILED: "실패",
};
export const runStatuses = Object.keys(
  runStatusLabels,
) as readonly RuleRunStatus[];
export const typeLabels: Readonly<Record<TaskType, string>> = {
  TASK: "일반 업무",
  DEV: "개발 업무",
};

const resultMessages: Readonly<Record<string, string>> = {
  PRIVATE_SOURCE_RESTRICTED:
    "비공개 원본 업무라 공유 채널에 게시하지 않았습니다.",
  ALREADY_APPLIED: "이미 적용되어 있었습니다.",
  REVIEWER_NOT_APPLICABLE: "개발 업무가 아니라 리뷰어를 지정하지 않았습니다.",
  TASK_NOT_ELIGIBLE: "업무가 삭제되었거나 프로젝트 업무가 아닙니다.",
  PROJECT_ARCHIVED: "프로젝트가 아카이브되었습니다.",
  RULE_DISABLED: "실행 전에 규칙이 꺼졌습니다.",
  DISCORD_NOT_CONFIGURED: "Discord 봇이 설정되지 않았습니다.",
  DISCORD_CHANNEL_MISSING: "보낼 업무 스레드나 프로젝트 채널이 없습니다.",
  DISCORD_SEND_FAILED: "Discord 전송이 여러 번 실패했습니다.",
  DISCORD_RESULT_UNKNOWN: "Discord 전송 결과를 확인하지 못했습니다.",
  RULE_ACTION_TARGET_MISSING: "대상 버킷이나 리뷰어가 삭제되었습니다.",
  RULE_ACTION_TARGET_INVALID:
    "대상 버킷이 보관되었거나 리뷰어가 참여자가 아닙니다.",
  RULE_ACTION_ERROR: "예상하지 못한 오류로 실행하지 못했습니다.",
};
/**
 * 실행 결과 code 의 한국어 이유. 서버가 새 code 를 더해도 원문 code 만 덩그러니 보이지 않게,
 * 비공개 원본 공유 제한 계열은 그 뜻으로, 나머지는 상태에 맞는 문장 + code 로 보여 준다.
 */
/** 사고 실행에는 대상 업무·업무 스레드가 없어 같은 code 라도 뜻이 다르다. */
const incidentResultMessages: Readonly<Record<string, string>> = {
  TASK_NOT_ELIGIBLE: "장애가 삭제되었습니다.",
  DISCORD_CHANNEL_MISSING: "Discord 프로젝트 채널이 연결되지 않았습니다.",
};
export function resultMessage(
  code: string | null,
  status?: RuleRunStatus,
  event?: RuleEvent,
): string | null {
  if (!code) return null;
  const known =
    (event === "INCIDENT_CREATED" ? incidentResultMessages[code] : undefined) ??
    resultMessages[code];
  if (known) return known;
  if (/PRIVATE|RESTRICT|SHARING/.test(code))
    return "비공개 원본 업무라 공유 채널에 게시하지 않았습니다.";
  if (status === "SKIPPED")
    return `조건이 맞지 않아 실행하지 않았습니다(${code}).`;
  if (status === "FAILED") return `실행하지 못했습니다(${code}).`;
  return code;
}

const errorMessages: Readonly<Record<string, string>> = {
  RULE_NOT_FOUND: "이미 삭제된 규칙입니다. 목록을 새로 불러왔습니다.",
  DUPLICATE_RULE_NAME: "같은 이름의 규칙이 있습니다. 다른 이름을 입력하세요.",
  RULE_EVENT_STATUS_NOT_APPLICABLE: "상태는 '상태가 바뀔 때'에서만 고릅니다.",
  RULE_CONDITION_INVALID: "조건 값이 올바르지 않습니다.",
  RULE_CONDITION_NOT_APPLICABLE: "장애 이벤트에는 조건을 둘 수 없습니다.",
  RULE_ACTION_NOT_APPLICABLE: "이 동작에 맞지 않는 대상이나 멘션이 있습니다.",
  RULE_ACTION_TARGET_REQUIRED:
    "옮길 버킷이나 지정할 리뷰어가 없습니다. 편집에서 대상을 고르세요.",
  PART_NOT_IN_PROJECT:
    "삭제되었거나 이 프로젝트에 없는 파트 조건이 있습니다. 편집에서 빼 주세요.",
  PLANNING_BUCKET_NOT_IN_PROJECT:
    "삭제되었거나 이 프로젝트에 없는 버킷이 있습니다. 편집에서 다시 고르세요.",
  PLANNING_BUCKET_ARCHIVED:
    "보관된 버킷으로는 옮길 수 없습니다. 다른 버킷을 고르세요.",
  REVIEWER_NOT_ALLOWED: "리뷰어는 이 프로젝트의 활성 참여자여야 합니다.",
  PROJECT_FORBIDDEN: "헤드 어드민 또는 PM만 자동화 규칙을 관리합니다.",
  PROJECT_ARCHIVED: "아카이브된 프로젝트는 규칙을 바꿀 수 없습니다.",
  PROJECT_NOT_FOUND: "프로젝트가 없거나 조회 권한이 없습니다.",
  VALIDATION_ERROR: "입력값을 확인해 주세요.",
};
export function ruleErrorMessage(error: {
  readonly code: string;
  readonly message: string;
}) {
  return errorMessages[error.code] ?? error.message;
}

export type RuleForm = {
  readonly name: string;
  readonly enabled: boolean;
  readonly event: RuleEvent;
  /** 빈 문자열 = 모든 상태 변경. */
  readonly eventStatus: TaskStatus | "";
  readonly conditions: Readonly<Record<RuleConditionField, readonly string[]>>;
  readonly action: RuleAction;
  readonly bucketId: string;
  readonly reviewerId: string;
  readonly mentions: RuleMentions;
};

export function emptyRuleForm(): RuleForm {
  return {
    name: "",
    enabled: true,
    event: "TASK_BLOCKED",
    eventStatus: "",
    conditions: { PRIORITY: [], TYPE: [], PART: [], BUCKET: [] },
    action: "NOTIFY_DISCORD",
    bucketId: "",
    reviewerId: "",
    mentions: { assignees: true, reviewers: false, pm: false },
  };
}

export function ruleToForm(rule: AutomationRule): RuleForm {
  const conditions = { PRIORITY: [], TYPE: [], PART: [], BUCKET: [] } as Record<
    RuleConditionField,
    string[]
  >;
  for (const condition of rule.conditions)
    conditions[condition.field].push(condition.value);
  return {
    name: rule.name,
    enabled: rule.enabled,
    event: rule.event,
    eventStatus: rule.eventStatus ?? "",
    conditions,
    action: rule.action,
    bucketId: rule.bucket?.id ?? "",
    reviewerId: rule.reviewer?.id ?? "",
    mentions: rule.mentions ?? {
      assignees: false,
      reviewers: false,
      pm: false,
    },
  };
}

/** 사고 이벤트는 조건 없이 Discord 알림(PM 멘션)만 된다(서버 저장 검증 3). */
export function allowedActions(event: RuleEvent): readonly RuleAction[] {
  return event === "INCIDENT_CREATED" ? ["NOTIFY_DISCORD"] : actions;
}

/** 이벤트를 바꾸면 그 이벤트가 허용하지 않는 동작은 Discord 알림으로 되돌린다(조건·대상은 남겨 두고 보낼 때 뺀다). */
export function changeEvent(form: RuleForm, event: RuleEvent): RuleForm {
  return {
    ...form,
    event,
    action: allowedActions(event).includes(form.action)
      ? form.action
      : "NOTIFY_DISCORD",
  };
}

/** 서버로 보낼 본문. 이벤트·동작에 맞지 않는 값은 빼서 RULE_*_NOT_APPLICABLE 을 미리 피한다. */
export function formToRequest(form: RuleForm): SaveRuleRequest {
  const incident = form.event === "INCIDENT_CREATED";
  return {
    name: form.name.trim(),
    enabled: form.enabled,
    event: form.event,
    eventStatus:
      form.event === "TASK_STATUS_CHANGED" && form.eventStatus
        ? form.eventStatus
        : null,
    conditions: incident
      ? []
      : conditionFields.flatMap((field) =>
          [...new Set(form.conditions[field])].map((value) => ({
            field,
            value,
          })),
        ),
    action: form.action,
    bucketId: form.action === "MOVE_BUCKET" ? form.bucketId || null : null,
    reviewerId:
      form.action === "ASSIGN_REVIEWER" ? form.reviewerId || null : null,
    mentions:
      form.action === "NOTIFY_DISCORD"
        ? incident
          ? { assignees: false, reviewers: false, pm: form.mentions.pm }
          : form.mentions
        : null,
  };
}

export type RuleFormErrors = Partial<
  Record<"name" | "bucketId" | "reviewerId", string>
>;
export function validateRuleForm(form: RuleForm): RuleFormErrors {
  const errors: RuleFormErrors = {};
  const name = form.name.trim();
  if (!name) errors.name = "규칙 이름을 입력하세요.";
  else if (name.length > 100) errors.name = "규칙 이름은 100자 이하입니다.";
  if (form.action === "MOVE_BUCKET" && !form.bucketId)
    errors.bucketId = "옮길 버킷을 고르세요.";
  if (form.action === "ASSIGN_REVIEWER" && !form.reviewerId)
    errors.reviewerId = "지정할 리뷰어를 고르세요.";
  return errors;
}

/** 켜기·끄기는 PUT 전체 본문으로 한다(서버에 토글 엔드포인트가 없다). */
export function toggleRequest(
  rule: AutomationRule,
  enabled: boolean,
): SaveRuleRequest {
  return formToRequest({ ...ruleToForm(rule), enabled });
}

/** 지워진 파트·버킷 조건, 지워진 동작 대상. 이런 규칙은 저장(켜기·끄기 포함)이 서버에서 거절된다. */
export function brokenReferences(rule: AutomationRule): readonly string[] {
  const problems = rule.conditions
    .filter((condition) => condition.label === null)
    .map((condition) => `삭제된 ${fieldLabels[condition.field]} 조건`);
  if (rule.action === "MOVE_BUCKET" && !rule.bucket)
    problems.push("삭제된 대상 버킷");
  if (rule.action === "ASSIGN_REVIEWER" && !rule.reviewer)
    problems.push("삭제된 리뷰어");
  return problems;
}

export function triggerText(rule: {
  readonly event: RuleEvent;
  readonly eventStatus: TaskStatus | null;
}): string {
  if (rule.event === "TASK_STATUS_CHANGED" && rule.eventStatus)
    return `상태가 ${statusLabels[rule.eventStatus]}(으)로 바뀔 때`;
  return eventLabels[rule.event];
}

export function conditionValueLabel(
  field: RuleConditionField,
  value: string,
  label: string | null,
): string {
  if (field === "PRIORITY")
    return priorityLabels[value as TaskPriority] ?? value;
  if (field === "TYPE") return typeLabels[value as TaskType] ?? value;
  return label ?? `삭제된 ${fieldLabels[field]}`;
}

export function actionText(rule: AutomationRule): string {
  const base = actionLabels[rule.action];
  if (rule.action === "MOVE_BUCKET")
    return `${base}: ${rule.bucket?.name ?? "삭제된 버킷"}`;
  if (rule.action === "ASSIGN_REVIEWER")
    return `${base}: ${rule.reviewer?.name ?? "삭제된 사용자"}`;
  if (rule.action === "NOTIFY_DISCORD") {
    const targets = [
      rule.mentions?.assignees && "담당자",
      rule.mentions?.reviewers && "리뷰어",
      rule.mentions?.pm && "PM",
    ].filter(Boolean);
    return targets.length ? `${base}, ${targets.join(", ")} 멘션` : base;
  }
  return base;
}

export const eventStatusOptions: readonly TaskStatus[] = taskStatuses;
