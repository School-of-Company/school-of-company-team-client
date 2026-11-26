import assert from "node:assert/strict";
import { test } from "node:test";
import {
  acceptsMessageTemplate,
  actionText,
  allowedActions,
  changeEvent,
  emptyRuleForm,
  eventHelp,
  formToRequest,
  isTasklessEvent,
  resultMessage,
  ruleToForm,
  runTargetFallback,
  selectableEvents,
  templateProblem,
  templateToForm,
  templateVariables,
  toggleRequest,
  triggerText,
  validateRuleForm,
  type AutomationRule,
  type RuleEvent,
  type RuleTemplate,
} from "./rule";

// 서버 AutomationRuleValidator.TASK_EVENTS 와 REQUIREMENT_EVENTS(s21 브랜치)를 옮긴 기대값.
const TASK_EVENTS: readonly RuleEvent[] = [
  "TASK_STATUS_CHANGED",
  "TASK_BLOCKED",
  "CI_FAILED",
  "REVIEW_REQUESTED",
  "DEADLINE_APPROACHING",
  "TASK_CREATED",
  "TASK_STALE",
];
const REQUIREMENT_EVENTS: readonly RuleEvent[] = [
  "REQUIREMENT_SUBMITTED",
  "REQUIREMENT_REPLIED",
];

// 서버 AutomationRuleValidator.allowedActions(s23 4.2)를 옮긴 기대값.
function serverAllowedActions(event: RuleEvent, task: boolean) {
  const base = ["NOTIFY_DISCORD", "CREATE_TASK", "DISCORD_DM", "WEBHOOK"];
  const incident = ["CREATE_INCIDENT", "ADD_INCIDENT_NOTE"];
  if (task)
    return [
      "NOTIFY_DISCORD",
      "MARK_ATTENTION",
      "ASSIGN_REVIEWER",
      "MOVE_BUCKET",
      "ASSIGN_USER",
      "SET_PRIORITY",
      "CREATE_TASK",
      "MOVE_STATUS",
      "ADD_TO_SPRINT",
      "SET_DEADLINE",
      "ADD_COMMENT",
      "CREATE_SUBTASK",
      "DISCORD_DM",
      "WEBHOOK",
      "ASSIGN_TO_AGENT",
      "ESCALATE",
    ];
  if (REQUIREMENT_EVENTS.includes(event)) return ["NOTIFY_DISCORD", "WEBHOOK"];
  if (event === "SERVICE_DOWN") return [...base, ...incident, "ESCALATE"];
  if (event === "SERVICE_DEGRADED" || event === "DEPLOY_FAILED")
    return [...base, ...incident];
  if (event === "SERVICE_RECOVERED")
    return ["NOTIFY_DISCORD", "DISCORD_DM", "WEBHOOK", "ADD_INCIDENT_NOTE"];
  if (event === "INCIDENT_CREATED") return [...base, "ESCALATE"];
  return base;
}

test("every event maps to the server's conditions, actions and template variables", () => {
  for (const event of selectableEvents) {
    const task = TASK_EVENTS.includes(event);
    assert.equal(isTasklessEvent(event), !task, event);
    assert.ok(eventHelp(event), event);
    assert.deepEqual(
      [...allowedActions(event)].sort(),
      [...serverAllowedActions(event, task)].sort(),
      event,
    );
  }
  assert.equal(selectableEvents.length, 20);
  assert.deepEqual(templateVariables("TASK_STALE"), ["task.key", "task.title"]);
  assert.deepEqual(templateVariables("SERVICE_DOWN"), ["service.name"]);
  assert.deepEqual(templateVariables("DEPLOY_FAILED"), ["service.name"]);
  assert.deepEqual(templateVariables("SPRINT_CLOSED"), ["sprint.name"]);
  assert.deepEqual(templateVariables("SPRINT_STARTED"), ["sprint.name"]);
  assert.deepEqual(templateVariables("MILESTONE_AT_RISK"), ["milestone.name"]);
  assert.deepEqual(templateVariables("SCHEDULE"), []);
  assert.deepEqual(templateVariables("INCIDENT_CREATED"), []);
  assert.deepEqual(templateVariables("UNKNOWN_EVENT"), []);
});

test("switching to a taskless event drops task-only actions", () => {
  const form = { ...emptyRuleForm(), action: "SET_PRIORITY" as const };
  assert.equal(changeEvent(form, "SERVICE_DOWN").action, "NOTIFY_DISCORD");
  const create = { ...emptyRuleForm(), action: "CREATE_TASK" as const };
  assert.equal(changeEvent(create, "SPRINT_CLOSED").action, "CREATE_TASK");
  assert.equal(
    changeEvent(create, "REQUIREMENT_SUBMITTED").action,
    "NOTIFY_DISCORD",
  );
});

test("form becomes a request with only the fields the event and action use", () => {
  const stale = formToRequest({
    ...emptyRuleForm(),
    name: "멈춘 업무",
    event: "TASK_STALE",
    staleDays: "5",
    scheduleDays: ["FRIDAY"],
    conditions: {
      PRIORITY: [],
      TYPE: ["DEV"],
      SIZE: [],
      PART: [],
      BUCKET: [],
      UNASSIGNED: ["true"],
      ASSIGNEE: [],
      SPRINT: [],
      DEADLINE: [],
    },
    action: "ASSIGN_USER",
    assigneeId: "U1",
    priority: "P0",
    titleTemplate: "x",
    messageTemplate: "y",
  });
  assert.equal(stale.staleDays, 5);
  assert.equal(stale.schedule, null);
  assert.equal(stale.assigneeId, "U1");
  assert.equal(stale.priority, null);
  assert.equal(stale.titleTemplate, null);
  assert.equal(stale.messageTemplate, null);
  assert.equal(stale.mentions, null);
  assert.deepEqual(stale.conditions, [
    { field: "TYPE", value: "DEV" },
    { field: "UNASSIGNED", value: "true" },
  ]);

  const schedule = formToRequest({
    ...emptyRuleForm(),
    name: "주간",
    event: "SCHEDULE",
    scheduleDays: ["FRIDAY", "MONDAY"],
    scheduleHour: 17,
    staleDays: "3",
    action: "NOTIFY_DISCORD",
    mentions: { assignees: true, reviewers: true, pm: true },
    messageTemplate: "  이번 주도 수고했습니다  ",
  });
  assert.equal(schedule.staleDays, null);
  assert.deepEqual(schedule.schedule, { days: ["MONDAY", "FRIDAY"], hour: 17 });
  assert.deepEqual(schedule.conditions, []);
  assert.deepEqual(schedule.mentions, {
    assignees: false,
    reviewers: false,
    pm: true,
  });
  assert.equal(schedule.messageTemplate, "이번 주도 수고했습니다");

  const create = formToRequest({
    ...emptyRuleForm(),
    name: "장애",
    event: "SERVICE_DOWN",
    action: "CREATE_TASK",
    titleTemplate: " [장애] {service.name} 다운 대응 ",
    messageTemplate: "무시",
  });
  assert.equal(create.titleTemplate, "[장애] {service.name} 다운 대응");
  assert.equal(create.messageTemplate, null);
  assert.equal(create.mentions, null);
  // 빈 문구는 null 로 보낸다(서버 Size(min = 1)).
  assert.equal(
    formToRequest({ ...emptyRuleForm(), messageTemplate: "   " })
      .messageTemplate,
    null,
  );
  assert.equal(
    formToRequest({
      ...emptyRuleForm(),
      action: "SET_PRIORITY",
      priority: "P1",
    }).priority,
    "P1",
  );
});

test("requirement events never send or validate a message template", () => {
  const form = {
    ...emptyRuleForm(),
    event: "REQUIREMENT_SUBMITTED" as const,
    messageTemplate: "@everyone {task.key}",
  };
  assert.equal(acceptsMessageTemplate(form.event), false);
  assert.equal(acceptsMessageTemplate("TASK_BLOCKED"), true);
  assert.equal(formToRequest(form).messageTemplate, null);
  assert.equal(validateRuleForm(form).messageTemplate, undefined);
});

test("templates reject unknown variables and mention syntax like the server", () => {
  assert.equal(templateProblem("{task.key} 멈춤", "TASK_STALE"), null);
  assert.ok(templateProblem("{service.name}", "TASK_STALE"));
  assert.ok(templateProblem("{sprint.name}", "SCHEDULE"));
  assert.ok(templateProblem("@everyone 보세요", "TASK_BLOCKED"));
  assert.ok(templateProblem("<@123> 확인", "TASK_BLOCKED"));
  assert.ok(templateProblem("<#456>", "TASK_BLOCKED"));
  assert.ok(templateProblem("@HERE", "TASK_BLOCKED"));
  assert.equal(templateProblem("주간 회고", "SCHEDULE"), null);
});

test("validation covers stale days, schedule, targets and templates", () => {
  const base = { ...emptyRuleForm(), name: "규칙" };
  assert.ok(
    validateRuleForm({ ...base, event: "TASK_STALE", staleDays: "0" })
      .staleDays,
  );
  assert.ok(
    validateRuleForm({ ...base, event: "TASK_STALE", staleDays: "31" })
      .staleDays,
  );
  assert.ok(
    validateRuleForm({ ...base, event: "TASK_STALE", staleDays: "2.5" })
      .staleDays,
  );
  assert.equal(
    validateRuleForm({ ...base, event: "TASK_STALE", staleDays: "30" })
      .staleDays,
    undefined,
  );
  assert.ok(
    validateRuleForm({ ...base, event: "SCHEDULE", scheduleDays: [] }).schedule,
  );
  assert.ok(validateRuleForm({ ...base, action: "ASSIGN_USER" }).assigneeId);
  assert.ok(validateRuleForm({ ...base, action: "SET_PRIORITY" }).priority);
  assert.ok(validateRuleForm({ ...base, action: "CREATE_TASK" }).titleTemplate);
  assert.ok(
    validateRuleForm({
      ...base,
      action: "CREATE_TASK",
      titleTemplate: "x".repeat(201),
    }).titleTemplate,
  );
  assert.ok(
    validateRuleForm({ ...base, messageTemplate: "x".repeat(501) })
      .messageTemplate,
  );
  assert.ok(
    validateRuleForm({ ...base, messageTemplate: "@here" }).messageTemplate,
  );
  assert.deepEqual(
    validateRuleForm({ ...base, messageTemplate: "{task.key} 막힘" }),
    {},
  );
});

const templates: readonly RuleTemplate[] = [
  {
    key: "STALE_TASK_ALERT",
    name: "3일 넘게 멈춘 업무 알림",
    description: "완료되지 않은 업무가 3일 동안 바뀌지 않으면 알립니다.",
    rule: {
      name: "3일 넘게 멈춘 업무 알림",
      enabled: true,
      event: "TASK_STALE",
      eventStatus: null,
      conditions: [],
      action: "NOTIFY_DISCORD",
      bucketId: null,
      reviewerId: null,
      mentions: { assignees: true, reviewers: false, pm: false },
      staleDays: 3,
      schedule: null,
      assigneeId: null,
      priority: null,
      titleTemplate: null,
      messageTemplate: null,
      projectIds: null,
      status: null,
      sprintId: null,
      days: null,
      dmUserId: null,
      channel: null,
      digestHour: null,
      webhookUrl: null,
      escalation: null,
    },
  },
  {
    key: "WEEKLY_RETRO_TASK",
    name: "매주 금요일 회고 업무",
    description: "매주 금요일 17시에 주간 회고 업무를 만듭니다.",
    // 서버가 null 필드를 생략해도 채워진다.
    rule: {
      event: "SCHEDULE",
      action: "CREATE_TASK",
      schedule: { days: ["FRIDAY"], hour: 17 },
      titleTemplate: "주간 회고",
    },
  },
];

test("a template prefills the editor and round-trips to the same body", () => {
  const stale = templateToForm(templates[0]!);
  assert.equal(stale.name, "3일 넘게 멈춘 업무 알림");
  assert.equal(stale.event, "TASK_STALE");
  assert.equal(stale.staleDays, "3");
  assert.deepEqual(stale.mentions, {
    assignees: true,
    reviewers: false,
    pm: false,
  });
  assert.deepEqual(formToRequest(stale), templates[0]!.rule);

  const retro = templateToForm(templates[1]!);
  assert.equal(retro.name, "매주 금요일 회고 업무");
  assert.deepEqual(retro.scheduleDays, ["FRIDAY"]);
  assert.equal(retro.scheduleHour, 17);
  assert.equal(retro.titleTemplate, "주간 회고");
  assert.deepEqual(validateRuleForm(retro), {});
  const body = formToRequest(retro);
  assert.deepEqual(body.schedule, { days: ["FRIDAY"], hour: 17 });
  assert.equal(body.titleTemplate, "주간 회고");
  assert.equal(body.mentions, null);
});

const v2Rule: AutomationRule = {
  id: "R2",
  projectId: "P1",
  name: "새 업무 담당",
  enabled: true,
  event: "TASK_CREATED",
  eventStatus: null,
  conditions: [{ field: "UNASSIGNED", value: "true", label: "담당자 없음" }],
  action: "ASSIGN_USER",
  bucket: null,
  reviewer: null,
  mentions: null,
  staleDays: null,
  schedule: null,
  assignee: { id: "U3", name: "김하늘" },
  priority: null,
  titleTemplate: null,
  messageTemplate: null,
  lastRun: null,
  createdAt: "2026-11-26T10:00:00+09:00",
  updatedAt: "2026-11-26T10:00:00+09:00",
};

test("v2 rules read back into the form and toggle without losing fields", () => {
  const form = ruleToForm(v2Rule);
  assert.equal(form.assigneeId, "U3");
  assert.deepEqual(form.conditions.UNASSIGNED, ["true"]);
  const body = toggleRequest(v2Rule, false);
  assert.equal(body.assigneeId, "U3");
  assert.deepEqual(body.conditions, [{ field: "UNASSIGNED", value: "true" }]);
  assert.equal(actionText(v2Rule), "담당자 지정: 김하늘");
  assert.equal(
    triggerText({ event: "TASK_STALE", eventStatus: null, staleDays: 3 }),
    "업무가 3일 동안 바뀌지 않을 때",
  );
  assert.equal(
    triggerText({
      event: "SCHEDULE",
      eventStatus: null,
      schedule: { days: ["FRIDAY", "MONDAY"], hour: 9 },
    }),
    "매주 월, 금 9시",
  );
});

test("new run codes and taskless targets read in Korean", () => {
  assert.equal(
    resultMessage("TASK_REVIEWER_IS_ASSIGNEE", "SKIPPED", "TASK_CREATED"),
    "담당자와 리뷰어는 같은 사람일 수 없어 지정하지 않았어요.",
  );
  assert.equal(
    resultMessage("TASK_NOT_ELIGIBLE", "SKIPPED", "MILESTONE_AT_RISK"),
    "마일스톤이 삭제되었거나 더 이상 위험하지 않아요.",
  );
  assert.equal(
    resultMessage("TASK_NOT_ELIGIBLE", "SKIPPED", "SERVICE_DOWN"),
    "서비스가 삭제되었거나 이 프로젝트와 연결이 끊겼어요.",
  );
  assert.equal(runTargetFallback("SCHEDULE"), "예약 실행");
  assert.equal(runTargetFallback("DEPLOY_FAILED"), "서비스");
  assert.equal(runTargetFallback("TASK_STALE"), "삭제된 업무");
});

test("toggling keeps condition fields the client does not know", () => {
  const rule = {
    ...v2Rule,
    event: "TASK_BLOCKED" as const,
    conditions: [
      { field: "PRIORITY", value: "P1", label: null },
      { field: "FUTURE_FIELD", value: "x", label: null },
    ],
  } as unknown as AutomationRule;
  assert.deepEqual(toggleRequest(rule, true).conditions, [
    { field: "PRIORITY", value: "P1" },
    { field: "FUTURE_FIELD", value: "x" },
  ]);
});
