import {
  priorityLabels,
  statusLabels,
  taskStatuses,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from "@/entities/task";

// 계약: 서버 docs/spec/s8-rules-search.md 3·4절, s21-automation-v2.md. 상태를 바꾸는 동작·외부 저장소 쓰기 동작은 서버 enum 에도 없다.
export type RuleEvent =
  | "TASK_STATUS_CHANGED"
  | "TASK_CREATED"
  | "TASK_BLOCKED"
  | "TASK_STALE"
  | "CI_FAILED"
  | "REVIEW_REQUESTED"
  | "DEADLINE_APPROACHING"
  | "INCIDENT_CREATED"
  | "SERVICE_DOWN"
  | "DEPLOY_FAILED"
  | "REQUIREMENT_SUBMITTED"
  | "REQUIREMENT_REPLIED"
  | "SPRINT_STARTED"
  | "SPRINT_ENDING_SOON"
  | "SPRINT_OVERDUE"
  | "SPRINT_CLOSED"
  | "MILESTONE_AT_RISK"
  | "SCHEDULE";
export type RuleAction =
  | "NOTIFY_DISCORD"
  | "MARK_ATTENTION"
  | "ASSIGN_REVIEWER"
  | "MOVE_BUCKET"
  | "ASSIGN_USER"
  | "SET_PRIORITY"
  | "CREATE_TASK";
export type RuleConditionField =
  "PRIORITY" | "TYPE" | "PART" | "BUCKET" | "UNASSIGNED";
export type RuleRunStatus =
  "PENDING" | "SENDING" | "SUCCEEDED" | "SKIPPED" | "FAILED";
export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";
export type RuleMentions = {
  readonly assignees: boolean;
  readonly reviewers: boolean;
  readonly pm: boolean;
};
export type RuleSchedule = {
  readonly days: readonly DayOfWeek[];
  readonly hour: number;
};
type TaskSummary = {
  readonly id: string;
  readonly key: string;
  readonly title: string;
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
  // 자동화 v2 필드. 해당 이벤트·동작이 아니면 null 이다.
  readonly staleDays?: number | null;
  readonly schedule?: RuleSchedule | null;
  readonly assignee?: { readonly id: string; readonly name: string } | null;
  readonly priority?: TaskPriority | null;
  readonly titleTemplate?: string | null;
  readonly messageTemplate?: string | null;
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
  readonly task: TaskSummary | null;
  readonly incidentId: string | null;
  readonly status: RuleRunStatus;
  readonly resultCode: string | null;
  readonly attempts: number;
  readonly createdAt: string;
  readonly finishedAt: string | null;
  /** 업무 만들기 동작이 만든 업무. 지워졌거나 읽을 수 없으면 null. */
  readonly createdTask?: TaskSummary | null;
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
  readonly staleDays: number | null;
  readonly schedule: RuleSchedule | null;
  readonly assigneeId: string | null;
  readonly priority: TaskPriority | null;
  readonly titleTemplate: string | null;
  readonly messageTemplate: string | null;
};

/** 미리보기 응답(s21 3.3). status·resultCode 는 지금 실행했을 때의 예상이다. */
export type RulePreview = {
  readonly supported: boolean;
  readonly since: string;
  readonly items: readonly {
    readonly event: RuleEvent;
    readonly occurredAt: string;
    readonly task: TaskSummary | null;
    readonly subject: string;
    readonly action: RuleAction;
    readonly status: RuleRunStatus;
    readonly resultCode: string | null;
    readonly detail: string;
  }[];
  readonly truncated: boolean;
};

/** 내장 템플릿(s21 3.4). rule 은 POST rules 본문 모양이고 서버가 빈 필드를 생략할 수도 있다. */
export type RuleTemplate = {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly rule: Partial<SaveRuleRequest> &
    Pick<SaveRuleRequest, "event" | "action">;
};

const TASK_VARIABLES = ["task.key", "task.title"] as const;
const SPRINT_VARIABLES = ["sprint.name"] as const;
const SERVICE_VARIABLES = ["service.name"] as const;

/**
 * 이벤트 정의를 모은 한 곳. 서버 AutomationRuleValidator(TASK_EVENTS·REQUIREMENT_EVENTS)와
 * RuleTemplateText.variables 를 그대로 옮겼다. 서버 RuleEvent 가 늘면 여기만 고친다.
 * kind: task = 조건과 업무 동작 가능, taskless = 조건 없음, Discord 알림(PM 멘션만)과 업무 만들기,
 * requirement = 외부인이 쓴 글이라 Discord 알림만.
 * 키 순서가 편집기의 선택 순서다(업무 이벤트, 그다음 업무가 없는 이벤트).
 */
const eventSpecs: Readonly<
  Record<
    RuleEvent,
    {
      readonly label: string;
      readonly help: string;
      readonly kind: "task" | "taskless" | "requirement";
      readonly variables: readonly string[];
      /** 업무가 없는 이벤트의 실행 기록에서 대상 칸에 쓸 말. */
      readonly target?: string;
      /** 업무가 없는 이벤트에서 TASK_NOT_ELIGIBLE 의 뜻. */
      readonly targetGone?: string;
    }
  >
> = {
  TASK_STATUS_CHANGED: {
    label: "상태가 바뀔 때",
    help: "업무 상태가 바뀌면 실행합니다. 특정 상태로 바뀔 때만 고를 수도 있습니다.",
    kind: "task",
    variables: TASK_VARIABLES,
  },
  TASK_CREATED: {
    label: "업무가 만들어질 때",
    help: "이 프로젝트에 업무가 새로 생기면 실행합니다. 규칙이 만든 업무에는 걸리지 않습니다.",
    kind: "task",
    variables: TASK_VARIABLES,
  },
  TASK_BLOCKED: {
    label: "막힘으로 표시될 때",
    help: "누군가 업무를 막힘으로 표시하면 실행합니다.",
    kind: "task",
    variables: TASK_VARIABLES,
  },
  TASK_STALE: {
    label: "업무가 멈춰 있을 때",
    help: "끝나지 않은 업무가 정한 일수 동안 바뀌지 않으면 실행합니다.",
    kind: "task",
    variables: TASK_VARIABLES,
  },
  CI_FAILED: {
    label: "연결된 PR의 CI가 실패할 때",
    help: "업무에 연결된 PR의 CI가 실패하면 실행합니다.",
    kind: "task",
    variables: TASK_VARIABLES,
  },
  REVIEW_REQUESTED: {
    label: "연결된 PR에 리뷰가 요청될 때",
    help: "업무에 연결된 PR에 리뷰 요청이 오면 실행합니다.",
    kind: "task",
    variables: TASK_VARIABLES,
  },
  DEADLINE_APPROACHING: {
    label: "마감 하루 전",
    help: "끝나지 않은 업무의 마감 전날 오전 9시에 실행합니다.",
    kind: "task",
    variables: TASK_VARIABLES,
  },
  INCIDENT_CREATED: {
    label: "장애가 생길 때",
    help: "장애의 영향 서비스가 이 프로젝트에 연결된 저장소를 쓰면 걸립니다.",
    kind: "taskless",
    variables: [],
    target: "삭제된 장애",
    targetGone: "장애가 삭제되었습니다.",
  },
  SERVICE_DOWN: {
    label: "서비스가 다운될 때",
    help: "모니터링이 이 프로젝트 저장소의 서비스가 멈췄다고 알리면 실행합니다. 장애 하나에 한 번입니다.",
    kind: "taskless",
    variables: SERVICE_VARIABLES,
    target: "서비스",
    targetGone: "서비스가 삭제되었거나 이 프로젝트와 연결이 끊겼습니다.",
  },
  DEPLOY_FAILED: {
    label: "프로덕션 배포가 실패할 때",
    help: "이 프로젝트 저장소의 프로덕션 배포가 실패하면 실행합니다. 배포 하나에 한 번입니다.",
    kind: "taskless",
    variables: SERVICE_VARIABLES,
    target: "서비스",
    targetGone: "서비스가 삭제되었거나 이 프로젝트와 연결이 끊겼습니다.",
  },
  REQUIREMENT_SUBMITTED: {
    label: "요구사항이 접수될 때",
    help: "외부 요청자가 요구사항을 보내면 실행합니다. Discord 알림만 됩니다.",
    kind: "requirement",
    variables: [],
    target: "요구사항",
    targetGone: "요구사항이 삭제되었거나 스팸으로 분류되었습니다.",
  },
  REQUIREMENT_REPLIED: {
    label: "요청자가 요구사항에 답글을 달 때",
    help: "요청자가 요구사항에 답글을 달면 실행합니다. Discord 알림만 됩니다.",
    kind: "requirement",
    variables: [],
    target: "요구사항",
    targetGone: "요구사항이 삭제되었거나 스팸으로 분류되었습니다.",
  },
  SPRINT_STARTED: {
    label: "스프린트가 시작될 때",
    help: "스프린트를 시작하면 실행합니다.",
    kind: "taskless",
    variables: SPRINT_VARIABLES,
    target: "스프린트",
    targetGone: "스프린트가 삭제되었거나 이미 끝났습니다.",
  },
  SPRINT_ENDING_SOON: {
    label: "스프린트 종료 2일 전부터",
    help: "진행 중인 스프린트의 종료일이 2일 남으면 한 번 실행합니다.",
    kind: "taskless",
    variables: SPRINT_VARIABLES,
    target: "스프린트",
    targetGone: "스프린트가 삭제되었거나 이미 끝났습니다.",
  },
  SPRINT_OVERDUE: {
    label: "스프린트 종료일이 지났을 때",
    help: "종료일이 지났는데 아직 끝내지 않은 스프린트가 있으면 한 번 실행합니다.",
    kind: "taskless",
    variables: SPRINT_VARIABLES,
    target: "스프린트",
    targetGone: "스프린트가 삭제되었거나 이미 끝났습니다.",
  },
  SPRINT_CLOSED: {
    label: "스프린트가 종료될 때",
    help: "스프린트를 종료하면 실행합니다. 회고 업무를 만들 때 좋습니다.",
    kind: "taskless",
    variables: SPRINT_VARIABLES,
    target: "스프린트",
    targetGone: "스프린트가 삭제되었습니다.",
  },
  MILESTONE_AT_RISK: {
    label: "마일스톤이 위험해질 때",
    help: "마일스톤이 위험 또는 지연이 되면 마감일마다 한 번 실행합니다. 진행률은 규칙을 저장한 사람 기준입니다.",
    kind: "taskless",
    variables: ["milestone.name"],
    target: "마일스톤",
    targetGone: "마일스톤이 삭제되었거나 더 이상 위험하지 않습니다.",
  },
  SCHEDULE: {
    label: "정한 요일과 시각에",
    help: "고른 요일의 정한 시각(한국 시간)에 하루 한 번 실행합니다. Discord 알림은 열린 업무, 막힌 업무, 이번 주 마감 개수를 요약합니다.",
    kind: "taskless",
    variables: [],
    target: "예약 실행",
  },
};

/** 이벤트 표시 이름. */
export const eventLabels: Readonly<Record<RuleEvent, string>> =
  Object.fromEntries(
    Object.entries(eventSpecs).map(([event, spec]) => [event, spec.label]),
  ) as Record<RuleEvent, string>;
export const selectableEvents = Object.keys(eventSpecs) as readonly RuleEvent[];
function specOf(event: string) {
  return Object.hasOwn(eventSpecs, event)
    ? eventSpecs[event as RuleEvent]
    : undefined;
}
/** 서버가 아직 클라이언트에 없는 이벤트를 보내도 빈 칸이나 undefined 가 보이지 않게 한다. */
export function eventLabel(event: string): string {
  return specOf(event)?.label ?? "알 수 없는 이벤트";
}
export function eventHelp(event: string): string {
  return specOf(event)?.help ?? "";
}
/**
 * 업무가 없는 이벤트(서버 TASKLESS_EVENTS = TASK_EVENTS 가 아닌 것).
 * 모르는 이벤트는 넣지 않는다: 규칙을 켜고 끌 때 서버가 받아 준 정의를 그대로 돌려보낸다.
 */
export function isTasklessEvent(event: string): boolean {
  const kind = specOf(event)?.kind;
  return kind === "taskless" || kind === "requirement";
}
/** 그 이벤트의 템플릿에서 쓸 수 있는 변수(중괄호 없이). */
export function templateVariables(event: string): readonly string[] {
  return specOf(event)?.variables ?? [];
}
export const actionLabels: Readonly<Record<RuleAction, string>> = {
  NOTIFY_DISCORD: "Discord로 알림",
  MARK_ATTENTION: "확인 필요로 표시",
  ASSIGN_REVIEWER: "리뷰어 지정",
  MOVE_BUCKET: "버킷으로 옮기기",
  ASSIGN_USER: "담당자 지정",
  SET_PRIORITY: "우선순위 변경",
  CREATE_TASK: "업무 만들기",
};
export const actionHelp: Readonly<Record<RuleAction, string>> = {
  NOTIFY_DISCORD: "Discord에 메시지를 올립니다. 문구를 직접 쓸 수도 있습니다.",
  MARK_ATTENTION: "업무를 확인 필요 목록에 올립니다.",
  ASSIGN_REVIEWER: "개발 업무에 리뷰어를 추가합니다.",
  MOVE_BUCKET: "업무를 고른 버킷으로 옮깁니다.",
  ASSIGN_USER:
    "업무에 담당자를 추가합니다. 이미 리뷰어인 사람은 추가하지 않습니다.",
  SET_PRIORITY: "업무 우선순위를 고른 값으로 바꿉니다.",
  CREATE_TASK:
    "이 프로젝트 백로그 맨 아래에 담당자 없는 업무를 하나 만듭니다. 만든 업무에는 다른 규칙이 걸리지 않습니다.",
};
export const actions = Object.keys(actionLabels) as readonly RuleAction[];
export const fieldLabels: Readonly<Record<RuleConditionField, string>> = {
  PRIORITY: "우선순위",
  TYPE: "유형",
  PART: "파트",
  BUCKET: "버킷",
  UNASSIGNED: "담당자",
};
export const conditionFields = Object.keys(
  fieldLabels,
) as readonly RuleConditionField[];
/** UNASSIGNED 조건의 값은 늘 "true"다(활성 담당자가 없을 때 참). */
export const UNASSIGNED_VALUE = "true";
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
export const dayLabels: Readonly<Record<DayOfWeek, string>> = {
  MONDAY: "월",
  TUESDAY: "화",
  WEDNESDAY: "수",
  THURSDAY: "목",
  FRIDAY: "금",
  SATURDAY: "토",
  SUNDAY: "일",
};
export const daysOfWeek = Object.keys(dayLabels) as readonly DayOfWeek[];

const resultMessages: Readonly<Record<string, string>> = {
  PRIVATE_SOURCE_RESTRICTED:
    "비공개 원본 업무라 공유 채널에 게시하지 않았습니다.",
  ALREADY_APPLIED: "이미 적용되어 있었습니다.",
  REVIEWER_NOT_APPLICABLE: "개발 업무가 아니라 리뷰어를 지정하지 않았습니다.",
  TASK_REVIEWER_IS_ASSIGNEE:
    "담당자와 리뷰어는 같은 사람일 수 없어 지정하지 않았습니다.",
  TASK_NOT_ELIGIBLE: "업무가 삭제되었거나 프로젝트 업무가 아닙니다.",
  PROJECT_ARCHIVED: "프로젝트가 아카이브되었습니다.",
  RULE_DISABLED: "실행 전에 규칙이 꺼졌습니다.",
  DISCORD_NOT_CONFIGURED: "Discord 봇이 설정되지 않았습니다.",
  DISCORD_CHANNEL_MISSING: "보낼 업무 스레드나 프로젝트 채널이 없습니다.",
  DISCORD_SEND_FAILED: "Discord 전송이 여러 번 실패했습니다.",
  DISCORD_RESULT_UNKNOWN: "Discord 전송 결과를 확인하지 못했습니다.",
  RULE_ACTION_TARGET_MISSING:
    "대상 버킷이나 사용자, 또는 규칙을 저장한 사람이 삭제되었습니다.",
  RULE_ACTION_TARGET_INVALID:
    "대상 버킷이 보관되었거나 지정할 사람이 활성 참여자가 아닙니다.",
  RULE_ACTION_ERROR: "예상하지 못한 오류로 실행하지 못했습니다.",
};
/** 업무가 없는 이벤트의 실행에는 대상 업무·업무 스레드가 없어 같은 code 라도 뜻이 다르다. */
function tasklessResultMessage(code: string, event: RuleEvent) {
  if (code === "TASK_NOT_ELIGIBLE") return specOf(event)?.targetGone;
  if (code === "DISCORD_CHANNEL_MISSING")
    return "Discord 프로젝트 채널이 연결되지 않았습니다.";
  return undefined;
}
/**
 * 실행 결과 code 의 한국어 이유. 서버가 새 code 를 더해도 원문 code 만 덩그러니 보이지 않게,
 * 비공개 원본 공유 제한 계열은 그 뜻으로, 나머지는 상태에 맞는 문장 + code 로 보여 준다.
 */
export function resultMessage(
  code: string | null,
  status?: RuleRunStatus,
  event?: RuleEvent,
): string | null {
  if (!code) return null;
  const known =
    (event && isTasklessEvent(event)
      ? tasklessResultMessage(code, event)
      : undefined) ?? resultMessages[code];
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
  RULE_EVENT_OPTION_REQUIRED: "멈춘 일수나 예약 요일과 시각을 입력하세요.",
  RULE_EVENT_OPTION_NOT_APPLICABLE:
    "이 이벤트에는 멈춘 일수나 예약 시각을 둘 수 없습니다.",
  RULE_CONDITION_INVALID: "조건 값이 올바르지 않습니다.",
  RULE_CONDITION_NOT_APPLICABLE: "이 이벤트에는 조건을 둘 수 없습니다.",
  RULE_ACTION_NOT_APPLICABLE:
    "이 이벤트나 동작에 맞지 않는 대상, 멘션, 문구가 있습니다.",
  RULE_ACTION_TARGET_REQUIRED:
    "동작에 필요한 대상이 없습니다. 편집에서 대상을 고르세요.",
  RULE_TEMPLATE_INVALID:
    "문구에 이 이벤트에서 쓸 수 없는 변수나 멘션 문법이 있습니다.",
  PART_NOT_IN_PROJECT:
    "삭제되었거나 이 프로젝트에 없는 파트 조건이 있습니다. 편집에서 빼 주세요.",
  PLANNING_BUCKET_NOT_IN_PROJECT:
    "삭제되었거나 이 프로젝트에 없는 버킷이 있습니다. 편집에서 다시 고르세요.",
  PLANNING_BUCKET_ARCHIVED:
    "보관된 버킷으로는 옮길 수 없습니다. 다른 버킷을 고르세요.",
  REVIEWER_NOT_ALLOWED: "리뷰어는 이 프로젝트의 활성 참여자여야 합니다.",
  ASSIGNEE_NOT_ALLOWED: "담당자는 이 프로젝트의 활성 참여자여야 합니다.",
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
  /** 입력 칸 그대로(문자열). 보낼 때 숫자로 바꾼다. */
  readonly staleDays: string;
  readonly scheduleDays: readonly DayOfWeek[];
  readonly scheduleHour: number;
  readonly assigneeId: string;
  readonly priority: TaskPriority | "";
  readonly titleTemplate: string;
  readonly messageTemplate: string;
};

function emptyConditions(): Record<RuleConditionField, string[]> {
  return { PRIORITY: [], TYPE: [], PART: [], BUCKET: [], UNASSIGNED: [] };
}
const noMentions: RuleMentions = {
  assignees: false,
  reviewers: false,
  pm: false,
};

export function emptyRuleForm(): RuleForm {
  return {
    name: "",
    enabled: true,
    event: "TASK_BLOCKED",
    eventStatus: "",
    conditions: emptyConditions(),
    action: "NOTIFY_DISCORD",
    bucketId: "",
    reviewerId: "",
    mentions: { assignees: true, reviewers: false, pm: false },
    staleDays: "3",
    scheduleDays: ["MONDAY"],
    scheduleHour: 9,
    assigneeId: "",
    priority: "",
    titleTemplate: "",
    messageTemplate: "",
  };
}

/** 요청 본문 모양(저장된 규칙·템플릿)을 폼으로. 빈 필드는 새 규칙 기본값을 쓴다. */
function bodyToForm(
  body: RuleTemplate["rule"],
  ids: {
    readonly bucketId?: string;
    readonly reviewerId?: string;
    readonly assigneeId?: string;
  },
): RuleForm {
  const base = emptyRuleForm();
  const conditions = emptyConditions();
  for (const condition of body.conditions ?? [])
    conditions[condition.field]?.push(condition.value);
  return {
    name: body.name ?? "",
    enabled: body.enabled ?? true,
    event: body.event,
    eventStatus: body.eventStatus ?? "",
    conditions,
    action: body.action,
    bucketId: ids.bucketId ?? body.bucketId ?? "",
    reviewerId: ids.reviewerId ?? body.reviewerId ?? "",
    mentions: body.mentions ?? noMentions,
    staleDays: body.staleDays != null ? String(body.staleDays) : base.staleDays,
    scheduleDays: body.schedule?.days ?? base.scheduleDays,
    scheduleHour: body.schedule?.hour ?? base.scheduleHour,
    assigneeId: ids.assigneeId ?? body.assigneeId ?? "",
    priority: body.priority ?? "",
    titleTemplate: body.titleTemplate ?? "",
    messageTemplate: body.messageTemplate ?? "",
  };
}

export function ruleToForm(rule: AutomationRule): RuleForm {
  return bodyToForm(rule, {
    bucketId: rule.bucket?.id ?? "",
    reviewerId: rule.reviewer?.id ?? "",
    assigneeId: rule.assignee?.id ?? "",
  });
}

/** 템플릿을 고르면 그 규칙으로 새 규칙 폼을 채운다(이름은 템플릿 이름). */
export function templateToForm(template: RuleTemplate): RuleForm {
  const form = bodyToForm(template.rule, {});
  return { ...form, name: form.name || template.name };
}

/**
 * 이벤트에 쓸 수 있는 동작(서버 저장 검증 3). 업무 이벤트는 전부, 업무가 없는 이벤트는
 * Discord 알림과 업무 만들기, 요구사항은 Discord 알림만. 모르는 이벤트는 막지 않는다(서버가 판정한다).
 */
export function allowedActions(event: RuleEvent): readonly RuleAction[] {
  const kind = specOf(event)?.kind;
  if (kind === "requirement") return ["NOTIFY_DISCORD"];
  if (kind === "taskless") return ["NOTIFY_DISCORD", "CREATE_TASK"];
  return actions;
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
  const taskless = isTasklessEvent(form.event);
  const notify = form.action === "NOTIFY_DISCORD";
  const staleDays = Number(form.staleDays);
  return {
    name: form.name.trim(),
    enabled: form.enabled,
    event: form.event,
    eventStatus:
      form.event === "TASK_STATUS_CHANGED" && form.eventStatus
        ? form.eventStatus
        : null,
    conditions: taskless
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
    mentions: notify
      ? taskless
        ? { ...noMentions, pm: form.mentions.pm }
        : form.mentions
      : null,
    staleDays:
      form.event === "TASK_STALE" && form.staleDays.trim() !== ""
        ? staleDays
        : null,
    schedule:
      form.event === "SCHEDULE"
        ? {
            // 요일 순서를 고정해 같은 규칙이 늘 같은 본문이 되게 한다.
            days: daysOfWeek.filter((day) => form.scheduleDays.includes(day)),
            hour: form.scheduleHour,
          }
        : null,
    assigneeId: form.action === "ASSIGN_USER" ? form.assigneeId || null : null,
    priority: form.action === "SET_PRIORITY" ? form.priority || null : null,
    titleTemplate:
      form.action === "CREATE_TASK" ? form.titleTemplate.trim() || null : null,
    messageTemplate: notify ? form.messageTemplate.trim() || null : null,
  };
}

const PLACEHOLDER = /\{([^{}]*)\}/g;
const FORBIDDEN_MENTION = /@everyone|@here|<@|<#/i;
export const TITLE_TEMPLATE_MAX = 200;
export const MESSAGE_TEMPLATE_MAX = 500;
/** 서버 RuleTemplateText.problem 과 같은 판정. 문제가 없으면 null. */
export function templateProblem(
  template: string,
  event: RuleEvent,
): string | null {
  if (!template.trim()) return "문구가 비어 있습니다.";
  if (FORBIDDEN_MENTION.test(template))
    return "@everyone, @here, <@…>, <#…> 같은 멘션 문법은 쓸 수 없습니다. 멘션은 아래 체크로 고르세요.";
  const allowed = templateVariables(event);
  for (const match of template.matchAll(PLACEHOLDER)) {
    const name = match[1] ?? "";
    if (!allowed.includes(name))
      return allowed.length
        ? `{${name}}은(는) 이 이벤트에서 쓸 수 없습니다. 쓸 수 있는 변수: ${allowed.map((v) => `{${v}}`).join(", ")}`
        : `{${name}}은(는) 쓸 수 없습니다. 이 이벤트에는 변수가 없습니다.`;
  }
  return null;
}

export type RuleFormErrors = Partial<
  Record<
    | "name"
    | "bucketId"
    | "reviewerId"
    | "staleDays"
    | "schedule"
    | "assigneeId"
    | "priority"
    | "titleTemplate"
    | "messageTemplate",
    string
  >
>;
export function validateRuleForm(form: RuleForm): RuleFormErrors {
  const errors: RuleFormErrors = {};
  const name = form.name.trim();
  if (!name) errors.name = "규칙 이름을 입력하세요.";
  else if (name.length > 100) errors.name = "규칙 이름은 100자 이하입니다.";
  if (form.event === "TASK_STALE") {
    const days = Number(form.staleDays);
    if (!Number.isInteger(days) || days < 1 || days > 30)
      errors.staleDays = "1에서 30 사이의 일수를 입력하세요.";
  }
  if (form.event === "SCHEDULE") {
    if (form.scheduleDays.length === 0)
      errors.schedule = "요일을 하나 이상 고르세요.";
    else if (
      !Number.isInteger(form.scheduleHour) ||
      form.scheduleHour < 0 ||
      form.scheduleHour > 23
    )
      errors.schedule = "시각은 0시에서 23시 사이입니다.";
  }
  if (form.action === "MOVE_BUCKET" && !form.bucketId)
    errors.bucketId = "옮길 버킷을 고르세요.";
  if (form.action === "ASSIGN_REVIEWER" && !form.reviewerId)
    errors.reviewerId = "지정할 리뷰어를 고르세요.";
  if (form.action === "ASSIGN_USER" && !form.assigneeId)
    errors.assigneeId = "지정할 담당자를 고르세요.";
  if (form.action === "SET_PRIORITY" && !form.priority)
    errors.priority = "바꿀 우선순위를 고르세요.";
  if (form.action === "CREATE_TASK") {
    const title = form.titleTemplate.trim();
    if (title.length > TITLE_TEMPLATE_MAX)
      errors.titleTemplate = `제목은 ${TITLE_TEMPLATE_MAX}자 이하입니다.`;
    else {
      const problem = templateProblem(title, form.event);
      if (problem)
        errors.titleTemplate = title ? problem : "만들 업무 제목을 입력하세요.";
    }
  }
  if (form.action === "NOTIFY_DISCORD" && form.messageTemplate.trim()) {
    const message = form.messageTemplate.trim();
    errors.messageTemplate =
      message.length > MESSAGE_TEMPLATE_MAX
        ? `문구는 ${MESSAGE_TEMPLATE_MAX}자 이하입니다.`
        : (templateProblem(message, form.event) ?? undefined);
    if (!errors.messageTemplate) delete errors.messageTemplate;
  }
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
  if (rule.action === "ASSIGN_USER" && !rule.assignee)
    problems.push("삭제된 담당자");
  return problems;
}

export function scheduleText(schedule: RuleSchedule): string {
  const days = daysOfWeek.filter((day) => schedule.days.includes(day));
  const label =
    days.length === 7
      ? "매일"
      : `매주 ${days.map((d) => dayLabels[d]).join(", ")}`;
  return `${label} ${schedule.hour}시`;
}

export function triggerText(rule: {
  readonly event: RuleEvent;
  readonly eventStatus: TaskStatus | null;
  readonly staleDays?: number | null;
  readonly schedule?: RuleSchedule | null;
}): string {
  if (rule.event === "TASK_STATUS_CHANGED" && rule.eventStatus)
    return `상태가 ${statusLabels[rule.eventStatus]}(으)로 바뀔 때`;
  if (rule.event === "TASK_STALE" && rule.staleDays)
    return `업무가 ${rule.staleDays}일 동안 바뀌지 않을 때`;
  if (rule.event === "SCHEDULE" && rule.schedule)
    return scheduleText(rule.schedule);
  return eventLabel(rule.event);
}

/** 실행 기록에 업무·장애 링크가 없을 때 대상 칸에 쓸 말. 업무가 없는 이벤트 실행에는 대상 ID 가 오지 않는다. */
export function runTargetFallback(event: RuleEvent): string {
  const spec = specOf(event);
  if (!spec) return "대상 없음";
  return spec.target ?? "삭제된 업무";
}

export function conditionValueLabel(
  field: RuleConditionField,
  value: string,
  label: string | null,
): string {
  if (field === "PRIORITY")
    return priorityLabels[value as TaskPriority] ?? value;
  if (field === "TYPE") return typeLabels[value as TaskType] ?? value;
  if (field === "UNASSIGNED") return "담당자 없음";
  return label ?? `삭제된 ${fieldLabels[field]}`;
}

export function actionText(rule: AutomationRule): string {
  const base = actionLabels[rule.action] ?? "알 수 없는 동작";
  if (rule.action === "MOVE_BUCKET")
    return `${base}: ${rule.bucket?.name ?? "삭제된 버킷"}`;
  if (rule.action === "ASSIGN_REVIEWER")
    return `${base}: ${rule.reviewer?.name ?? "삭제된 사용자"}`;
  if (rule.action === "ASSIGN_USER")
    return `${base}: ${rule.assignee?.name ?? "삭제된 사용자"}`;
  if (rule.action === "SET_PRIORITY" && rule.priority)
    return `${base}: ${priorityLabels[rule.priority] ?? rule.priority}`;
  if (rule.action === "CREATE_TASK" && rule.titleTemplate)
    return `${base}: ${rule.titleTemplate}`;
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
