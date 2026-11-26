import {
  priorityLabels,
  sizeLabels,
  statusLabels,
  taskStatuses,
  type TaskPriority,
  type TaskSize,
  type TaskStatus,
  type TaskType,
} from "@/entities/task";

// 계약: 서버 docs/spec/s8-rules-search.md 3·4절, s21-automation-v2.md, s23-automation-v3.md.
// GitHub·캘린더에 직접 쓰는 동작은 서버 enum 에도 없다. 바깥 연동은 WEBHOOK(n8n)으로만 간다.
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
  | "SCHEDULE"
  | "SERVICE_DEGRADED"
  | "SERVICE_RECOVERED";
export type RuleAction =
  | "NOTIFY_DISCORD"
  | "MARK_ATTENTION"
  | "ASSIGN_REVIEWER"
  | "MOVE_BUCKET"
  | "ASSIGN_USER"
  | "SET_PRIORITY"
  | "CREATE_TASK"
  | "MOVE_STATUS"
  | "ADD_TO_SPRINT"
  | "SET_DEADLINE"
  | "ADD_COMMENT"
  | "CREATE_SUBTASK"
  | "DISCORD_DM"
  | "WEBHOOK"
  | "ASSIGN_TO_AGENT"
  | "ESCALATE"
  | "CREATE_INCIDENT"
  | "ADD_INCIDENT_NOTE";
export type RuleConditionField =
  | "PRIORITY"
  | "TYPE"
  | "SIZE"
  | "PART"
  | "BUCKET"
  | "UNASSIGNED"
  | "ASSIGNEE"
  | "SPRINT"
  | "DEADLINE";
/** PROJECT = 프로젝트 ADMIN 이 관리, TEAM = 헤드 어드민이 관리하고 모든(또는 고른) 프로젝트에 걸린다. */
export type RuleScope = "PROJECT" | "TEAM";
export type RuleChannel = "PROJECT" | "TEAM";
export type EscalationTarget = "ASSIGNEE" | "PM" | "LEAD";
export type RuleDisabledReason = "CONSECUTIVE_FAILURES" | "RATE_LIMIT";
export type EscalationStep = {
  readonly afterHours: number;
  readonly notify: EscalationTarget;
};
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
  /** 팀 규칙이면 null. */
  readonly projectId: string | null;
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
  // 자동화 v3 필드(s23 3.3). 해당 없으면 null 이거나 없다.
  readonly scope?: RuleScope;
  /** 팀 규칙의 프로젝트 필터. null 이면 모든 프로젝트. */
  readonly projects?:
    | readonly {
        readonly id: string;
        readonly key: string;
        readonly name: string;
      }[]
    | null;
  readonly status?: TaskStatus | null;
  readonly sprint?: { readonly id: string; readonly name: string } | null;
  readonly days?: number | null;
  readonly dmUser?: { readonly id: string; readonly name: string } | null;
  readonly channel?: RuleChannel | null;
  readonly digestHour?: number | null;
  readonly webhookUrl?: string | null;
  /** 생성·재발급 응답에서만 값이 온다. 받은 즉시 떼어 내고 캐시에 두지 않는다(stripWebhookSecret). */
  readonly webhookSecret?: string | null;
  readonly escalation?: readonly EscalationStep[] | null;
  readonly consecutiveFailures?: number;
  readonly disabledReason?: RuleDisabledReason | null;
  readonly disabledAt?: string | null;
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
  /** 계기 장애, 또는 장애 동작이 만들거나 메모를 남긴 장애. */
  readonly incidentId: string | null;
  /** 장애 등록이 성공해 만든 장애. 지워졌으면 null. */
  readonly createdIncidentId?: string | null;
  readonly status: RuleRunStatus;
  readonly resultCode: string | null;
  readonly attempts: number;
  readonly createdAt: string;
  readonly finishedAt: string | null;
  /** 업무 만들기·연결 업무 만들기가 만든 업무. 지워졌거나 읽을 수 없으면 null. */
  readonly createdTask?: TaskSummary | null;
  /** 웹훅·전송 실패 이유 한 줄(HTTP 500, timeout, blocked). 받는 쪽 응답 본문은 없다. */
  readonly lastError?: string | null;
  /** 웹훅 마지막 HTTP 상태. */
  readonly httpStatus?: number | null;
  /** 실행된 프로젝트. 팀 규칙 기록에서 어느 프로젝트의 계기인지 알려 준다. */
  readonly projectId?: string | null;
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
  readonly projectIds: readonly string[] | null;
  readonly status: TaskStatus | null;
  readonly sprintId: string | null;
  readonly days: number | null;
  readonly dmUserId: string | null;
  readonly channel: RuleChannel | null;
  readonly digestHour: number | null;
  readonly webhookUrl: string | null;
  readonly escalation: readonly EscalationStep[] | null;
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
    help: "업무 상태가 바뀌면 실행해요. 특정 상태로 바뀔 때만 고를 수도 있어요.",
    kind: "task",
    variables: TASK_VARIABLES,
  },
  TASK_CREATED: {
    label: "업무가 만들어질 때",
    help: "이 프로젝트에 업무가 새로 생기면 실행해요. 규칙이 만든 업무에는 걸리지 않아요.",
    kind: "task",
    variables: TASK_VARIABLES,
  },
  TASK_BLOCKED: {
    label: "막힘으로 표시될 때",
    help: "누군가 업무를 막힘으로 표시하면 실행해요.",
    kind: "task",
    variables: TASK_VARIABLES,
  },
  TASK_STALE: {
    label: "업무가 멈춰 있을 때",
    help: "끝나지 않은 업무가 정한 일수 동안 바뀌지 않으면 실행해요. 규칙이 만든 업무는 빼고 봐요.",
    kind: "task",
    variables: TASK_VARIABLES,
  },
  CI_FAILED: {
    label: "연결된 PR의 CI가 실패할 때",
    help: "업무에 연결된 PR의 CI가 실패하면 실행해요.",
    kind: "task",
    variables: TASK_VARIABLES,
  },
  REVIEW_REQUESTED: {
    label: "연결된 PR에 리뷰가 요청될 때",
    help: "업무에 연결된 PR에 리뷰 요청이 오면 실행해요.",
    kind: "task",
    variables: TASK_VARIABLES,
  },
  DEADLINE_APPROACHING: {
    label: "마감 하루 전",
    help: "끝나지 않은 업무의 마감 전날 오전 9시에 실행해요.",
    kind: "task",
    variables: TASK_VARIABLES,
  },
  INCIDENT_CREATED: {
    label: "장애가 생길 때",
    help: "장애의 영향 서비스가 이 프로젝트에 연결된 저장소를 쓰면 걸려요.",
    kind: "taskless",
    variables: [],
    target: "삭제된 장애",
    targetGone: "장애가 삭제되었어요.",
  },
  SERVICE_DOWN: {
    label: "서비스가 다운될 때",
    help: "모니터링이 이 프로젝트 저장소의 서비스가 멈췄다고 알리면 실행해요. 장애 하나에 한 번이에요.",
    kind: "taskless",
    variables: SERVICE_VARIABLES,
    target: "서비스",
    targetGone: "서비스가 삭제되었거나 이 프로젝트와 연결이 끊겼어요.",
  },
  DEPLOY_FAILED: {
    label: "프로덕션 배포가 실패할 때",
    help: "이 프로젝트 저장소의 프로덕션 배포가 실패하면 실행해요. 배포 하나에 한 번이에요.",
    kind: "taskless",
    variables: SERVICE_VARIABLES,
    target: "서비스",
    targetGone: "서비스가 삭제되었거나 이 프로젝트와 연결이 끊겼어요.",
  },
  REQUIREMENT_SUBMITTED: {
    label: "요구사항이 접수될 때",
    help: "외부 요청자가 요구사항을 보내면 실행해요. Discord 알림만 돼요.",
    kind: "requirement",
    variables: [],
    target: "요구사항",
    targetGone: "요구사항이 삭제되었거나 스팸으로 분류되었어요.",
  },
  REQUIREMENT_REPLIED: {
    label: "요청자가 요구사항에 답글을 달 때",
    help: "요청자가 요구사항에 답글을 달면 실행해요. Discord 알림만 돼요.",
    kind: "requirement",
    variables: [],
    target: "요구사항",
    targetGone: "요구사항이 삭제되었거나 스팸으로 분류되었어요.",
  },
  SPRINT_STARTED: {
    label: "스프린트가 시작될 때",
    help: "스프린트를 시작하면 실행해요.",
    kind: "taskless",
    variables: SPRINT_VARIABLES,
    target: "스프린트",
    targetGone: "스프린트가 삭제되었거나 이미 끝났어요.",
  },
  SPRINT_ENDING_SOON: {
    label: "스프린트 종료 2일 전부터",
    help: "진행 중인 스프린트의 종료일이 2일 남으면 한 번 실행해요.",
    kind: "taskless",
    variables: SPRINT_VARIABLES,
    target: "스프린트",
    targetGone: "스프린트가 삭제되었거나 이미 끝났어요.",
  },
  SPRINT_OVERDUE: {
    label: "스프린트 종료일이 지났을 때",
    help: "종료일이 지났는데 아직 끝내지 않은 스프린트가 있으면 한 번 실행해요.",
    kind: "taskless",
    variables: SPRINT_VARIABLES,
    target: "스프린트",
    targetGone: "스프린트가 삭제되었거나 이미 끝났어요.",
  },
  SPRINT_CLOSED: {
    label: "스프린트가 종료될 때",
    help: "스프린트를 종료하면 실행해요. 회고 업무를 만들 때 좋아요.",
    kind: "taskless",
    variables: SPRINT_VARIABLES,
    target: "스프린트",
    targetGone: "스프린트가 삭제되었어요.",
  },
  MILESTONE_AT_RISK: {
    label: "마일스톤이 위험해질 때",
    help: "마일스톤이 위험 또는 지연이 되면 마감일마다 한 번 실행해요. 진행률은 규칙을 저장한 사람 기준이에요.",
    kind: "taskless",
    variables: ["milestone.name"],
    target: "마일스톤",
    targetGone: "마일스톤이 삭제되었거나 더 이상 위험하지 않아요.",
  },
  SCHEDULE: {
    label: "정한 요일과 시각에",
    help: "고른 요일의 정한 시각(한국 시간)에 하루 한 번 실행해요. Discord 알림은 열린 업무, 막힌 업무, 이번 주 마감 개수를 요약해요.",
    kind: "taskless",
    variables: [],
    target: "예약 실행",
  },
  SERVICE_DEGRADED: {
    label: "서비스가 느려질 때",
    help: "헬스체크가 이 프로젝트 저장소의 서비스를 성능 저하로 판정하면 실행해요. 서비스마다 한 시간에 한 번이에요.",
    kind: "taskless",
    variables: SERVICE_VARIABLES,
    target: "서비스",
    targetGone: "서비스가 삭제되었거나 이 프로젝트와 연결이 끊겼어요.",
  },
  SERVICE_RECOVERED: {
    label: "서비스가 복구될 때",
    help: "열린 장애가 있는 서비스가 다시 정상 신호를 보내면 실행해요. 장애 상태는 바꾸지 않아요.",
    kind: "taskless",
    variables: SERVICE_VARIABLES,
    target: "서비스",
    targetGone: "서비스가 삭제되었거나 이 프로젝트와 연결이 끊겼어요.",
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
/** 요구사항 이벤트는 고정 본문이라 Discord 문구 템플릿을 받지 않는다(서버 RULE_ACTION_NOT_APPLICABLE). */
export function acceptsMessageTemplate(event: string): boolean {
  return specOf(event)?.kind !== "requirement";
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
  MOVE_STATUS: "상태 바꾸기",
  ADD_TO_SPRINT: "스프린트에 넣기",
  SET_DEADLINE: "마감일 정하기",
  ADD_COMMENT: "댓글 남기기",
  CREATE_SUBTASK: "연결 업무 만들기",
  DISCORD_DM: "Discord DM 보내기",
  WEBHOOK: "웹훅 보내기",
  ASSIGN_TO_AGENT: "에이전트에게 맡기기",
  ESCALATE: "에스컬레이션",
  CREATE_INCIDENT: "장애 등록",
  ADD_INCIDENT_NOTE: "장애에 메모 남기기",
};
export const actionHelp: Readonly<Record<RuleAction, string>> = {
  NOTIFY_DISCORD: "Discord에 메시지를 올려요. 문구를 직접 쓸 수도 있어요.",
  MARK_ATTENTION: "업무를 확인 필요 목록에 올려요.",
  ASSIGN_REVIEWER: "개발 업무에 리뷰어를 추가해요.",
  MOVE_BUCKET: "업무를 고른 버킷으로 옮겨요.",
  ASSIGN_USER:
    "업무에 담당자를 추가해요. 이미 리뷰어인 사람은 추가하지 않아요.",
  SET_PRIORITY: "업무 우선순위를 고른 값으로 바꿔요.",
  CREATE_TASK:
    "이 프로젝트 백로그 맨 아래에 담당자 없는 업무를 하나 만들어요. 만든 업무에는 다른 규칙이 걸리지 않아요.",
  MOVE_STATUS:
    "업무를 고른 상태 컬럼 맨 아래로 옮겨요. 일반 업무는 리뷰로 옮기지 않아요.",
  ADD_TO_SPRINT:
    "업무를 스프린트에 넣어요. 이미 열린 스프린트에 있으면 옮기지 않아요.",
  SET_DEADLINE:
    "마감일을 오늘부터 정한 일수 뒤로 정해요. 사람이 정한 마감일은 덮지 않아요.",
  ADD_COMMENT: "규칙을 저장한 사람 이름으로 업무에 댓글을 남겨요.",
  CREATE_SUBTASK:
    "같은 프로젝트 백로그 맨 아래에 이 업무와 연결된 업무를 만들어요.",
  DISCORD_DM:
    "고른 사람에게 Discord DM을 보내요. 그 업무를 지금 볼 수 있는 사람에게만 가요.",
  WEBHOOK:
    "이벤트를 JSON으로 n8n 같은 곳에 보내요. 실패하면 1, 5, 15, 60분 뒤 다시 보내요.",
  ASSIGN_TO_AGENT:
    "업무를 에이전트 대기열에 넣어요. MCP로 붙은 에이전트가 가져가요.",
  ESCALATE:
    "풀리지 않으면 정한 시간마다 다음 사람에게 DM을 보내요. 풀리면 저절로 멈춰요.",
  CREATE_INCIDENT:
    "열린 장애가 없을 때만 서비스 장애를 등록해요. 심각도는 서비스 티어를 따라요.",
  ADD_INCIDENT_NOTE:
    "그 서비스의 열린 장애 타임라인에 메모를 남겨요. 장애 상태는 바꾸지 않아요.",
};
export const actions = Object.keys(actionLabels) as readonly RuleAction[];
export const fieldLabels: Readonly<Record<RuleConditionField, string>> = {
  PRIORITY: "우선순위",
  TYPE: "유형",
  SIZE: "크기",
  PART: "파트",
  BUCKET: "버킷",
  UNASSIGNED: "담당자",
  ASSIGNEE: "담당자",
  SPRINT: "스프린트",
  DEADLINE: "마감일",
};
export const conditionFields = Object.keys(
  fieldLabels,
) as readonly RuleConditionField[];
/** UNASSIGNED 조건의 값은 늘 "true"다(활성 담당자가 없을 때 참). */
export const UNASSIGNED_VALUE = "true";
/** 참과 거짓 중 하나만 고르는 조건(서버는 둘 다 주면 RULE_CONDITION_INVALID). */
export const BOOLEAN_FIELDS: readonly RuleConditionField[] = [
  "SPRINT",
  "DEADLINE",
];
const booleanLabels: Readonly<
  Partial<Record<RuleConditionField, Record<"true" | "false", string>>>
> = {
  SPRINT: { true: "스프린트 안", false: "스프린트 밖" },
  DEADLINE: { true: "마감일 있음", false: "마감일 없음" },
};
/** 팀 규칙은 프로젝트마다 다른 ID 를 가리키는 조건을 쓸 수 없다(D23-3). */
const PROJECT_ONLY_FIELDS: readonly RuleConditionField[] = ["PART", "BUCKET"];
export function scopeConditionFields(
  scope: RuleScope,
): readonly RuleConditionField[] {
  return scope === "TEAM"
    ? conditionFields.filter((field) => !PROJECT_ONLY_FIELDS.includes(field))
    : conditionFields;
}
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
export const escalationTargetLabels: Readonly<
  Record<EscalationTarget, string>
> = {
  ASSIGNEE: "담당자",
  PM: "PM",
  LEAD: "헤드 어드민",
};
export const disabledReasonLabels: Readonly<
  Record<RuleDisabledReason, string>
> = {
  CONSECUTIVE_FAILURES: "연속 5회 실패해서 꺼졌어요.",
  RATE_LIMIT: "1시간에 100번 넘게 실행돼서 꺼졌어요.",
};
export function disabledReasonText(reason: string): string {
  return (
    disabledReasonLabels[reason as RuleDisabledReason] ?? "자동으로 꺼졌어요."
  );
}

const resultMessages: Readonly<Record<string, string>> = {
  ALREADY_APPLIED: "이미 적용되어 있었어요.",
  REVIEWER_NOT_APPLICABLE: "개발 업무가 아니라 리뷰어를 지정하지 않았어요.",
  TASK_REVIEWER_IS_ASSIGNEE:
    "담당자와 리뷰어는 같은 사람일 수 없어 지정하지 않았어요.",
  TASK_NOT_ELIGIBLE: "업무가 삭제되었거나 프로젝트 업무가 아니에요.",
  PROJECT_ARCHIVED: "프로젝트가 아카이브되었어요.",
  RULE_DISABLED: "실행 전에 규칙이 꺼졌어요.",
  DISCORD_NOT_CONFIGURED: "Discord 봇이 설정되지 않았어요.",
  DISCORD_CHANNEL_MISSING: "보낼 업무 스레드나 프로젝트 채널이 없어요.",
  DISCORD_SEND_FAILED: "Discord 전송이 여러 번 실패했어요.",
  DISCORD_RESULT_UNKNOWN: "Discord 전송 결과를 확인하지 못했어요.",
  RULE_ACTION_TARGET_MISSING:
    "대상 버킷이나 사용자, 또는 규칙을 저장한 사람이 삭제되었어요.",
  RULE_ACTION_TARGET_INVALID:
    "대상 버킷이 보관되었거나 지정할 사람이 활성 참여자가 아니에요.",
  RULE_ACTION_ERROR: "예상하지 못한 오류로 실행하지 못했어요.",
  // 자동화 v3(s23 9절).
  REVIEW_NOT_ALLOWED: "일반 업무는 리뷰 상태로 옮기지 않아요.",
  NO_ACTIVE_SPRINT: "진행 중인 스프린트가 없어요.",
  DEADLINE_ALREADY_SET: "이미 마감일이 있어서 바꾸지 않았어요.",
  DISCORD_NOT_LINKED: "업무를 볼 수 있고 Discord를 연결한 받는 사람이 없어요.",
  CHANNEL_NOT_ALLOWED:
    "참여자에게만 공개된 프로젝트의 업무라 팀 채널에 올리지 않았어요.",
  DIGEST_QUEUED: "요약에 모아 두었어요. 정한 시각에 한 번에 보내요.",
  WEBHOOK_BLOCKED:
    "보낼 수 없는 주소라 보내지 않았어요. 공개 https 주소인지 확인하세요.",
  WEBHOOK_FAILED: "웹훅을 5번 보냈지만 모두 실패했어요.",
  INCIDENT_ALREADY_OPEN: "이 서비스에 이미 열린 장애가 있어요.",
  NO_OPEN_INCIDENT: "이 서비스에 열린 장애가 없어요.",
};
/** 업무가 없는 이벤트의 실행에는 대상 업무·업무 스레드가 없어 같은 code 라도 뜻이 다르다. */
function tasklessResultMessage(code: string, event: RuleEvent) {
  if (code === "TASK_NOT_ELIGIBLE") return specOf(event)?.targetGone;
  if (code === "DISCORD_CHANNEL_MISSING")
    return "Discord 프로젝트 채널이 연결되지 않았어요.";
  return undefined;
}
/** 동작마다 뜻이 갈리는 code. */
function actionResultMessage(code: string, action?: RuleAction) {
  if (code === "RULE_ACTION_TARGET_MISSING") {
    if (action === "ADD_TO_SPRINT") return "넣을 스프린트가 삭제되었어요.";
    if (action === "CREATE_INCIDENT")
      return "서비스가 삭제되었거나 보관되었어요.";
    if (action === "ADD_COMMENT" || action === "CREATE_SUBTASK")
      return "규칙을 저장한 사람이 삭제되었어요.";
  }
  if (code === "RULE_ACTION_TARGET_INVALID" && action === "ADD_TO_SPRINT")
    return "넣을 스프린트가 이미 끝났어요.";
  if (code === "TASK_NOT_ELIGIBLE" && action === "ASSIGN_TO_AGENT")
    return "완료되었거나 삭제된 업무라 대기열에 넣지 않았어요.";
  if (code === "ALREADY_APPLIED") {
    if (action === "ASSIGN_TO_AGENT") return "이미 에이전트 대기열에 있어요.";
    if (action === "ESCALATE")
      return "같은 대상에 에스컬레이션이 진행 중이에요.";
    if (action === "ADD_TO_SPRINT") return "이미 열린 스프린트에 있어요.";
  }
  return undefined;
}
/** 비공개 원본 제한(s21 5절): 알림은 공유 채널 게시를, 업무 만들기는 제목이 옮겨 가는 것을 막는다. */
function privateSourceMessage(action?: RuleAction) {
  if (action === "NOTIFY_DISCORD")
    return "비공개 원본 업무라 공유 채널에 게시하지 않았어요.";
  if (action === "CREATE_TASK" || action === "CREATE_SUBTASK")
    return "비공개 원본 업무의 제목이 새 업무로 옮겨 가지 않게 업무를 만들지 않았어요.";
  return "비공개 원본 업무라 실행하지 않았어요.";
}
/**
 * 실행 결과 code 의 한국어 이유. 서버가 새 code 를 더해도 원문 code 만 덩그러니 보이지 않게,
 * 비공개 원본 공유 제한 계열은 그 뜻으로, 나머지는 상태에 맞는 문장 + code 로 보여 준다.
 */
export function resultMessage(
  code: string | null,
  status?: RuleRunStatus,
  event?: RuleEvent,
  action?: RuleAction,
): string | null {
  if (!code) return null;
  if (/PRIVATE|RESTRICT|SHARING/.test(code) && !resultMessages[code])
    return privateSourceMessage(action);
  const known =
    actionResultMessage(code, action) ??
    (event && isTasklessEvent(event)
      ? tasklessResultMessage(code, event)
      : undefined) ??
    resultMessages[code];
  if (known) return known;
  if (status === "SKIPPED")
    return `조건이 맞지 않아 실행하지 않았어요(${code}).`;
  if (status === "FAILED") return `실행하지 못했어요(${code}).`;
  return code;
}

/** 웹훅 전달 기록 한 줄(s23 3.3). 웹훅이 아니거나 남은 게 없으면 null. */
export function deliveryText(run: {
  readonly attempts: number;
  readonly httpStatus?: number | null;
  readonly lastError?: string | null;
}): string | null {
  const parts = [
    run.httpStatus != null ? `HTTP ${run.httpStatus}` : null,
    run.lastError && run.lastError !== `HTTP ${run.httpStatus}`
      ? run.lastError
      : null,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return `${run.attempts}회 시도, 마지막 응답 ${parts.join(", ")}`;
}

const errorMessages: Readonly<Record<string, string>> = {
  RULE_NOT_FOUND: "이미 삭제된 규칙이에요. 목록을 새로 불러왔어요.",
  DUPLICATE_RULE_NAME: "같은 이름의 규칙이 있어요. 다른 이름을 입력하세요.",
  RULE_EVENT_STATUS_NOT_APPLICABLE: "상태는 '상태가 바뀔 때'에서만 골라요.",
  RULE_EVENT_OPTION_REQUIRED: "멈춘 일수나 예약 요일과 시각을 입력하세요.",
  RULE_EVENT_OPTION_NOT_APPLICABLE:
    "이 이벤트에는 멈춘 일수나 예약 시각을 둘 수 없어요.",
  RULE_CONDITION_INVALID: "조건 값이 올바르지 않아요.",
  RULE_CONDITION_NOT_APPLICABLE: "이 이벤트에는 조건을 둘 수 없어요.",
  RULE_ACTION_NOT_APPLICABLE:
    "이 이벤트나 동작에 맞지 않는 대상, 멘션, 문구가 있어요.",
  RULE_ACTION_TARGET_REQUIRED:
    "동작에 필요한 대상이 없어요. 편집에서 대상을 고르세요.",
  RULE_ACTION_TARGET_INVALID:
    "고른 스프린트가 끝났거나, DM 받을 사람이 활성 사용자가 아니거나 이 프로젝트를 볼 수 없어요.",
  RULE_TEMPLATE_INVALID:
    "문구에 이 이벤트에서 쓸 수 없는 변수나 멘션 문법이 있어요.",
  RULE_SCOPE_OPTION_NOT_APPLICABLE:
    "팀 규칙에는 파트, 버킷, 스프린트, 리뷰어, 담당자를 고를 수 없어요.",
  RULE_WEBHOOK_URL_INVALID:
    "웹훅 주소는 사용자 정보가 없는 공개 https 주소여야 해요.",
  PART_NOT_IN_PROJECT:
    "삭제되었거나 이 프로젝트에 없는 파트 조건이 있어요. 편집에서 빼 주세요.",
  PLANNING_BUCKET_NOT_IN_PROJECT:
    "삭제되었거나 이 프로젝트에 없는 버킷이 있어요. 편집에서 다시 고르세요.",
  PLANNING_BUCKET_ARCHIVED:
    "보관된 버킷으로는 옮길 수 없어요. 다른 버킷을 고르세요.",
  REVIEWER_NOT_ALLOWED: "리뷰어는 이 프로젝트의 활성 참여자여야 해요.",
  ASSIGNEE_NOT_ALLOWED: "담당자는 이 프로젝트의 활성 참여자여야 해요.",
  PROJECT_FORBIDDEN: "헤드 어드민 또는 PM만 자동화 규칙을 관리해요.",
  ACCESS_DENIED: "헤드 어드민만 팀 규칙과 자동화 현황을 볼 수 있어요.",
  PROJECT_ARCHIVED: "아카이브된 프로젝트는 규칙을 바꿀 수 없어요.",
  PROJECT_NOT_FOUND: "프로젝트가 없거나 조회 권한이 없어요.",
  VALIDATION_ERROR: "입력값을 확인해 주세요.",
};
export function ruleErrorMessage(error: {
  readonly code: string;
  readonly message: string;
}) {
  return errorMessages[error.code] ?? error.message;
}

export type EscalationStepForm = {
  /** 입력 칸 그대로(문자열). 보낼 때 숫자로 바꾼다. */
  readonly afterHours: string;
  readonly notify: EscalationTarget;
};

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
  /** 팀 규칙 프로젝트 필터. 비우면 모든 프로젝트. */
  readonly projectIds: readonly string[];
  readonly status: TaskStatus | "";
  /** 빈 문자열 = 진행 중 스프린트. */
  readonly sprintId: string;
  /** SET_DEADLINE·ASSIGN_TO_AGENT 의 일수. 입력 칸 그대로. */
  readonly days: string;
  readonly dmUserId: string;
  readonly channel: RuleChannel;
  /** 빈 문자열 = 바로 게시. */
  readonly digestHour: number | "";
  readonly webhookUrl: string;
  readonly escalation: readonly EscalationStepForm[];
};

function emptyConditions(): Record<RuleConditionField, string[]> {
  return Object.fromEntries(
    conditionFields.map((field) => [field, []]),
  ) as unknown as Record<RuleConditionField, string[]>;
}
const noMentions: RuleMentions = {
  assignees: false,
  reviewers: false,
  pm: false,
};
const defaultEscalation: readonly EscalationStepForm[] = [
  { afterHours: "4", notify: "ASSIGNEE" },
  { afterHours: "24", notify: "PM" },
];

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
    projectIds: [],
    status: "",
    sprintId: "",
    days: "",
    dmUserId: "",
    channel: "PROJECT",
    digestHour: "",
    webhookUrl: "",
    escalation: defaultEscalation,
  };
}

/** 요청 본문 모양(저장된 규칙·템플릿)을 폼으로. 빈 필드는 새 규칙 기본값을 쓴다. */
function bodyToForm(
  body: RuleTemplate["rule"],
  ids: {
    readonly bucketId?: string;
    readonly reviewerId?: string;
    readonly assigneeId?: string;
    readonly sprintId?: string;
    readonly dmUserId?: string;
    readonly projectIds?: readonly string[];
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
    projectIds: ids.projectIds ?? body.projectIds ?? [],
    status: body.status ?? "",
    sprintId: ids.sprintId ?? body.sprintId ?? "",
    days: body.days != null ? String(body.days) : "",
    dmUserId: ids.dmUserId ?? body.dmUserId ?? "",
    channel: body.channel ?? "PROJECT",
    digestHour: body.digestHour ?? "",
    webhookUrl: body.webhookUrl ?? "",
    escalation: body.escalation?.length
      ? body.escalation.map((step) => ({
          afterHours: String(step.afterHours),
          notify: step.notify,
        }))
      : base.escalation,
  };
}

export function ruleToForm(rule: AutomationRule): RuleForm {
  return bodyToForm(
    {
      ...rule,
      escalation: rule.escalation ?? null,
      projectIds: null,
    },
    {
      bucketId: rule.bucket?.id ?? "",
      reviewerId: rule.reviewer?.id ?? "",
      assigneeId: rule.assignee?.id ?? "",
      sprintId: rule.sprint?.id ?? "",
      dmUserId: rule.dmUser?.id ?? "",
      projectIds: rule.projects?.map((project) => project.id) ?? [],
    },
  );
}

/** 템플릿을 고르면 그 규칙으로 새 규칙 폼을 채운다(이름은 템플릿 이름). */
export function templateToForm(template: RuleTemplate): RuleForm {
  const form = bodyToForm(template.rule, {});
  return { ...form, name: form.name || template.name };
}

const TASKLESS_BASE: readonly RuleAction[] = [
  "NOTIFY_DISCORD",
  "CREATE_TASK",
  "DISCORD_DM",
  "WEBHOOK",
];
const INCIDENT_ACTIONS: readonly RuleAction[] = [
  "CREATE_INCIDENT",
  "ADD_INCIDENT_NOTE",
];
/** 팀 규칙에서 쓸 수 없는 동작: 대상이 프로젝트마다 다른 ID 라 필수 대상을 둘 수 없다(D23-3). */
const PROJECT_ONLY_ACTIONS: readonly RuleAction[] = [
  "MOVE_BUCKET",
  "ASSIGN_REVIEWER",
  "ASSIGN_USER",
];

/**
 * 이벤트에 쓸 수 있는 동작(서버 AutomationRuleValidator.allowedActions, s23 4.2).
 * 모르는 이벤트는 막지 않는다(서버가 판정한다). 순서는 actions 순서를 따른다.
 */
export function allowedActions(
  event: RuleEvent,
  scope: RuleScope = "PROJECT",
): readonly RuleAction[] {
  const spec = specOf(event);
  let allowed: readonly RuleAction[];
  if (!spec || spec.kind === "task")
    allowed = actions.filter((action) => !INCIDENT_ACTIONS.includes(action));
  else if (spec.kind === "requirement") allowed = ["NOTIFY_DISCORD", "WEBHOOK"];
  else if (event === "SERVICE_DOWN")
    allowed = [...TASKLESS_BASE, ...INCIDENT_ACTIONS, "ESCALATE"];
  else if (event === "SERVICE_DEGRADED" || event === "DEPLOY_FAILED")
    allowed = [...TASKLESS_BASE, ...INCIDENT_ACTIONS];
  else if (event === "SERVICE_RECOVERED")
    allowed = ["NOTIFY_DISCORD", "DISCORD_DM", "WEBHOOK", "ADD_INCIDENT_NOTE"];
  else if (event === "INCIDENT_CREATED")
    allowed = [...TASKLESS_BASE, "ESCALATE"];
  else allowed = TASKLESS_BASE;
  return actions.filter(
    (action) =>
      allowed.includes(action) &&
      !(scope === "TEAM" && PROJECT_ONLY_ACTIONS.includes(action)),
  );
}

/** 이벤트를 바꾸면 그 이벤트가 허용하지 않는 동작은 Discord 알림으로 되돌린다(조건·대상은 남겨 두고 보낼 때 뺀다). */
export function changeEvent(
  form: RuleForm,
  event: RuleEvent,
  scope: RuleScope = "PROJECT",
): RuleForm {
  return {
    ...form,
    event,
    action: allowedActions(event, scope).includes(form.action)
      ? form.action
      : "NOTIFY_DISCORD",
  };
}

/** 그 동작이 문구 템플릿을 받는지(서버 TARGETS 의 MESSAGE). ADD_COMMENT 는 필수다. */
export function usesMessageTemplate(action: RuleAction, event: RuleEvent) {
  if (!acceptsMessageTemplate(event)) return false;
  return (
    action === "NOTIFY_DISCORD" ||
    action === "DISCORD_DM" ||
    action === "ADD_COMMENT" ||
    action === "ASSIGN_TO_AGENT" ||
    action === "ADD_INCIDENT_NOTE"
  );
}
/** 그 동작이 제목 템플릿을 받는지. 둘 다 필수다. */
export function usesTitleTemplate(action: RuleAction) {
  return action === "CREATE_TASK" || action === "CREATE_SUBTASK";
}
/** 멘션(받는 사람) 체크를 쓰는 동작. */
export function usesMentions(action: RuleAction) {
  return action === "NOTIFY_DISCORD" || action === "DISCORD_DM";
}
/** 업무 없는 이벤트의 에스컬레이션 대상은 PM·헤드 어드민뿐이다. */
export function escalationTargets(
  event: RuleEvent,
): readonly EscalationTarget[] {
  return isTasklessEvent(event) ? ["PM", "LEAD"] : ["ASSIGNEE", "PM", "LEAD"];
}
export const ESCALATION_MAX_STEPS = 3;
export const ESCALATION_MAX_HOURS = 168;

function numberOrNull(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

/** 서버로 보낼 본문. 이벤트·동작·범위에 맞지 않는 값은 빼서 RULE_*_NOT_APPLICABLE 을 미리 피한다. */
export function formToRequest(
  form: RuleForm,
  scope: RuleScope = "PROJECT",
): SaveRuleRequest {
  const taskless = isTasklessEvent(form.event);
  const team = scope === "TEAM";
  const action = form.action;
  const notify = action === "NOTIFY_DISCORD";
  const staleDays = Number(form.staleDays);
  const fields = scopeConditionFields(scope);
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
      : fields.flatMap((field) =>
          [...new Set(form.conditions[field])].map((value) => ({
            field,
            value,
          })),
        ),
    action,
    bucketId: !team && action === "MOVE_BUCKET" ? form.bucketId || null : null,
    reviewerId:
      !team && action === "ASSIGN_REVIEWER" ? form.reviewerId || null : null,
    mentions: usesMentions(action)
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
    assigneeId:
      !team && action === "ASSIGN_USER" ? form.assigneeId || null : null,
    priority: action === "SET_PRIORITY" ? form.priority || null : null,
    titleTemplate: usesTitleTemplate(action)
      ? form.titleTemplate.trim() || null
      : null,
    messageTemplate: usesMessageTemplate(action, form.event)
      ? form.messageTemplate.trim() || null
      : null,
    projectIds:
      team && form.projectIds.length > 0 ? [...form.projectIds].sort() : null,
    status: action === "MOVE_STATUS" ? form.status || null : null,
    sprintId:
      !team && action === "ADD_TO_SPRINT" ? form.sprintId || null : null,
    days:
      action === "SET_DEADLINE" || action === "ASSIGN_TO_AGENT"
        ? numberOrNull(form.days)
        : null,
    dmUserId: action === "DISCORD_DM" ? form.dmUserId || null : null,
    // 기본값(프로젝트 채널, 바로 게시)은 보내지 않아 저장된 본문이 늘 같다.
    channel: notify && form.channel === "TEAM" ? "TEAM" : null,
    digestHour: notify && form.digestHour !== "" ? form.digestHour : null,
    webhookUrl: action === "WEBHOOK" ? form.webhookUrl.trim() || null : null,
    escalation:
      action === "ESCALATE"
        ? form.escalation.map((step) => ({
            afterHours: Number(step.afterHours),
            notify: step.notify,
          }))
        : null,
  };
}

const PLACEHOLDER = /\{([^{}]*)\}/g;
const FORBIDDEN_MENTION = /@everyone|@here|<@|<#/i;
export const TITLE_TEMPLATE_MAX = 200;
export const MESSAGE_TEMPLATE_MAX = 500;
export const WEBHOOK_URL_MAX = 500;
/** 서버 RuleTemplateText.problem 과 같은 판정. 문제가 없으면 null. */
export function templateProblem(
  template: string,
  event: RuleEvent,
): string | null {
  if (!template.trim()) return "문구가 비어 있어요.";
  if (FORBIDDEN_MENTION.test(template))
    return "@everyone, @here, <@…>, <#…> 같은 멘션 문법은 쓸 수 없어요. 멘션은 아래 체크로 고르세요.";
  const allowed = templateVariables(event);
  for (const match of template.matchAll(PLACEHOLDER)) {
    const name = match[1] ?? "";
    if (!allowed.includes(name))
      return allowed.length
        ? `{${name}}은(는) 이 이벤트에서 쓸 수 없어요. 쓸 수 있는 변수: ${allowed.map((v) => `{${v}}`).join(", ")}`
        : `{${name}}은(는) 쓸 수 없어요. 이 이벤트에는 변수가 없어요.`;
  }
  return null;
}

/**
 * 웹훅 주소 첫 판정(서버 WebhookTargetPolicy 의 일부). 내부 허용 목록(http://n8n:5678/webhook/ 같은 주소)은
 * 서버만 알아서 http 도 보내 보고 서버 판정(RULE_WEBHOOK_URL_INVALID)에 맡긴다.
 */
export function webhookUrlProblem(value: string): string | null {
  const url = value.trim();
  if (!url) return "보낼 주소를 입력하세요.";
  if (url.length > WEBHOOK_URL_MAX)
    return `주소는 ${WEBHOOK_URL_MAX}자 이하예요.`;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "https://로 시작하는 주소를 입력하세요.";
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
    return "https://로 시작하는 주소를 입력하세요.";
  if (parsed.username || parsed.password)
    return "주소에 사용자 이름이나 비밀번호를 넣을 수 없어요.";
  return null;
}

/** 에스컬레이션 단계 판정(서버 Bean Validation + 오름차순). 문제가 없으면 null. */
export function escalationProblem(
  steps: readonly EscalationStepForm[],
  event: RuleEvent,
): string | null {
  if (steps.length < 1 || steps.length > ESCALATION_MAX_STEPS)
    return `단계는 1개에서 ${ESCALATION_MAX_STEPS}개까지예요.`;
  const allowed = escalationTargets(event);
  let previous = 0;
  for (const step of steps) {
    const hours = Number(step.afterHours);
    if (
      step.afterHours.trim() === "" ||
      !Number.isInteger(hours) ||
      hours < 1 ||
      hours > ESCALATION_MAX_HOURS
    )
      return `시간은 1에서 ${ESCALATION_MAX_HOURS} 사이로 입력하세요.`;
    if (hours <= previous) return "뒤 단계일수록 시간이 길어야 해요.";
    if (!allowed.includes(step.notify))
      return "이 이벤트에는 업무 담당자가 없어 PM이나 헤드 어드민에게만 보내요.";
    previous = hours;
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
    | "messageTemplate"
    | "conditions"
    | "status"
    | "days"
    | "dmUserId"
    | "webhookUrl"
    | "escalation",
    string
  >
>;
export function validateRuleForm(
  form: RuleForm,
  scope: RuleScope = "PROJECT",
): RuleFormErrors {
  const errors: RuleFormErrors = {};
  const name = form.name.trim();
  const action = form.action;
  if (!name) errors.name = "규칙 이름을 입력하세요.";
  else if (name.length > 100) errors.name = "규칙 이름은 100자 이하예요.";
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
      errors.schedule = "시각은 0시에서 23시 사이예요.";
  }
  if (
    !isTasklessEvent(form.event) &&
    BOOLEAN_FIELDS.some((field) => form.conditions[field].length > 1)
  )
    errors.conditions = "스프린트와 마감일 조건은 하나만 고르세요.";
  if (scope === "PROJECT") {
    if (action === "MOVE_BUCKET" && !form.bucketId)
      errors.bucketId = "옮길 버킷을 고르세요.";
    if (action === "ASSIGN_REVIEWER" && !form.reviewerId)
      errors.reviewerId = "지정할 리뷰어를 고르세요.";
    if (action === "ASSIGN_USER" && !form.assigneeId)
      errors.assigneeId = "지정할 담당자를 고르세요.";
  }
  if (action === "SET_PRIORITY" && !form.priority)
    errors.priority = "바꿀 우선순위를 고르세요.";
  if (action === "MOVE_STATUS" && !form.status)
    errors.status = "옮길 상태를 고르세요.";
  if (action === "SET_DEADLINE" || action === "ASSIGN_TO_AGENT") {
    const required = action === "SET_DEADLINE";
    const [min, max] = required ? [0, 365] : [1, 30];
    const days = Number(form.days);
    if (form.days.trim() === "") {
      if (required) errors.days = "며칠 뒤로 정할지 입력하세요.";
    } else if (!Number.isInteger(days) || days < min || days > max)
      errors.days = `${min}에서 ${max} 사이의 일수를 입력하세요.`;
  }
  if (
    action === "DISCORD_DM" &&
    !form.dmUserId &&
    !(isTasklessEvent(form.event)
      ? form.mentions.pm
      : form.mentions.assignees || form.mentions.reviewers || form.mentions.pm)
  )
    errors.dmUserId = "DM 받을 사람을 하나 이상 고르세요.";
  if (action === "WEBHOOK") {
    const problem = webhookUrlProblem(form.webhookUrl);
    if (problem) errors.webhookUrl = problem;
  }
  if (action === "ESCALATE") {
    const problem = escalationProblem(form.escalation, form.event);
    if (problem) errors.escalation = problem;
  }
  if (usesTitleTemplate(action)) {
    const title = form.titleTemplate.trim();
    if (title.length > TITLE_TEMPLATE_MAX)
      errors.titleTemplate = `제목은 ${TITLE_TEMPLATE_MAX}자 이하예요.`;
    else {
      const problem = templateProblem(title, form.event);
      if (problem)
        errors.titleTemplate = title ? problem : "만들 업무 제목을 입력하세요.";
    }
  }
  if (usesMessageTemplate(action, form.event)) {
    const message = form.messageTemplate.trim();
    if (message) {
      const problem =
        message.length > MESSAGE_TEMPLATE_MAX
          ? `문구는 ${MESSAGE_TEMPLATE_MAX}자 이하예요.`
          : templateProblem(message, form.event);
      if (problem) errors.messageTemplate = problem;
    } else if (action === "ADD_COMMENT")
      errors.messageTemplate = "남길 댓글을 입력하세요.";
  }
  return errors;
}

/** 켜기·끄기는 PUT 전체 본문으로 한다(서버에 토글 엔드포인트가 없다). 다시 켜면 서버가 자동 끔 이유를 지운다. */
export function toggleRequest(
  rule: AutomationRule,
  enabled: boolean,
): SaveRuleRequest {
  return {
    ...formToRequest({ ...ruleToForm(rule), enabled }, rule.scope ?? "PROJECT"),
    // 폼이 모르는 조건 필드(서버가 새로 더한 것)도 켜고 끄는 사이에 지워지지 않게 받은 그대로 보낸다.
    conditions: rule.conditions.map(({ field, value }) => ({ field, value })),
  };
}

/**
 * 웹훅 비밀값은 생성·재발급 응답에서 한 번만 온다(D23-10). 받은 규칙에서 떼어 내 화면 상태로만 넘기고,
 * 쿼리 캐시나 저장소에는 비밀값이 없는 규칙만 둔다.
 */
export function stripWebhookSecret<
  T extends { readonly webhookSecret?: string | null },
>(value: T): { readonly value: T; readonly secret: string | null } {
  const { webhookSecret, ...rest } = value;
  return { value: rest as T, secret: webhookSecret || null };
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
  if (field === "SIZE") return sizeLabels[value as TaskSize] ?? value;
  if (field === "UNASSIGNED") return "담당자 없음";
  const boolean = booleanLabels[field];
  if (boolean) return boolean[value as "true" | "false"] ?? value;
  if (field === "ASSIGNEE") return label ?? "삭제된 사용자";
  return label ?? `삭제된 ${fieldLabels[field]}`;
}

function mentionTargets(mentions: RuleMentions | null | undefined) {
  return [
    mentions?.assignees && "담당자",
    mentions?.reviewers && "리뷰어",
    mentions?.pm && "PM",
  ].filter((target): target is string => !!target);
}

export function actionText(rule: AutomationRule): string {
  const base = actionLabels[rule.action] ?? "알 수 없는 동작";
  switch (rule.action) {
    case "MOVE_BUCKET":
      return `${base}: ${rule.bucket?.name ?? "삭제된 버킷"}`;
    case "ASSIGN_REVIEWER":
      return `${base}: ${rule.reviewer?.name ?? "삭제된 사용자"}`;
    case "ASSIGN_USER":
      return `${base}: ${rule.assignee?.name ?? "삭제된 사용자"}`;
    case "SET_PRIORITY":
      return rule.priority
        ? `${base}: ${priorityLabels[rule.priority] ?? rule.priority}`
        : base;
    case "CREATE_TASK":
    case "CREATE_SUBTASK":
      return rule.titleTemplate ? `${base}: ${rule.titleTemplate}` : base;
    case "MOVE_STATUS":
      return rule.status
        ? `${base}: ${statusLabels[rule.status] ?? rule.status}`
        : base;
    case "ADD_TO_SPRINT":
      return `${base}: ${rule.sprint?.name ?? "진행 중 스프린트"}`;
    case "SET_DEADLINE":
      return rule.days != null ? `${base}: ${rule.days}일 뒤` : base;
    case "ASSIGN_TO_AGENT":
      return rule.days != null ? `${base}, 기한 ${rule.days}일` : base;
    case "DISCORD_DM": {
      const targets = [
        ...mentionTargets(rule.mentions),
        rule.dmUser?.name,
      ].filter(Boolean);
      return targets.length ? `${base}: ${targets.join(", ")}` : base;
    }
    case "WEBHOOK":
      return rule.webhookUrl
        ? `${base}: ${webhookHost(rule.webhookUrl)}`
        : base;
    case "ESCALATE":
      return rule.escalation?.length
        ? `${base}: ${rule.escalation
            .map(
              (step) =>
                `${step.afterHours}시간 ${escalationTargetLabels[step.notify] ?? step.notify}`,
            )
            .join(", ")}`
        : base;
    case "NOTIFY_DISCORD": {
      const targets = mentionTargets(rule.mentions);
      const parts = [
        rule.channel === "TEAM" ? "팀 채널" : null,
        targets.length ? `${targets.join(", ")} 멘션` : null,
        rule.digestHour != null ? `매일 ${rule.digestHour}시 요약` : null,
      ].filter(Boolean);
      return parts.length ? `${base}, ${parts.join(", ")}` : base;
    }
    default:
      return base;
  }
}

/** 목록에는 주소 전체 대신 호스트만 보여 준다(경로에 토큰을 넣는 서비스가 있다). */
function webhookHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export const eventStatusOptions: readonly TaskStatus[] = taskStatuses;
