import assert from "node:assert/strict";
import { test } from "node:test";
import {
  actionText,
  allowedActions,
  changeEvent,
  conditionValueLabel,
  deliveryText,
  disabledReasonText,
  emptyRuleForm,
  escalationProblem,
  formToRequest,
  resultMessage,
  ruleErrorMessage,
  ruleToForm,
  stripWebhookSecret,
  toggleRequest,
  validateRuleForm,
  webhookUrlProblem,
  type AutomationRule,
  type RuleForm,
} from "./rule";

const base: RuleForm = { ...emptyRuleForm(), name: "규칙" };

const teamRule: AutomationRule = {
  id: "T1",
  projectId: null,
  scope: "TEAM",
  projects: [
    { id: "P2", key: "OPS", name: "운영" },
    { id: "P1", key: "HUB", name: "허브" },
  ],
  name: "막힘 에스컬레이션",
  enabled: false,
  event: "TASK_BLOCKED",
  eventStatus: null,
  conditions: [
    { field: "SIZE", value: "L", label: "L" },
    { field: "SPRINT", value: "true", label: "Sprint 안" },
  ],
  action: "ESCALATE",
  bucket: null,
  reviewer: null,
  mentions: null,
  escalation: [
    { afterHours: 4, notify: "ASSIGNEE" },
    { afterHours: 24, notify: "PM" },
    { afterHours: 48, notify: "LEAD" },
  ],
  consecutiveFailures: 5,
  disabledReason: "CONSECUTIVE_FAILURES",
  disabledAt: "2026-11-26T10:00:00+09:00",
  lastRun: null,
  createdAt: "2026-11-26T09:00:00+09:00",
  updatedAt: "2026-11-26T09:00:00+09:00",
};

test("새 조건은 AND 로 함께 가고 같은 필드는 값을 여럿 보낸다", () => {
  const body = formToRequest({
    ...base,
    conditions: {
      ...base.conditions,
      SIZE: ["L", "XL"],
      ASSIGNEE: ["U1"],
      SPRINT: ["true"],
      DEADLINE: ["false"],
    },
  });
  assert.deepEqual(body.conditions, [
    { field: "SIZE", value: "L" },
    { field: "SIZE", value: "XL" },
    { field: "ASSIGNEE", value: "U1" },
    { field: "SPRINT", value: "true" },
    { field: "DEADLINE", value: "false" },
  ]);
  assert.equal(conditionValueLabel("SIZE", "XL", "XL"), "1주");
  assert.equal(conditionValueLabel("SPRINT", "false", null), "스프린트 밖");
  assert.equal(conditionValueLabel("DEADLINE", "true", null), "마감일 있음");
  assert.equal(conditionValueLabel("ASSIGNEE", "U1", "김하나"), "김하나");
});

test("스프린트와 마감일 조건에 참과 거짓을 함께 두면 저장 전에 막는다", () => {
  const both = {
    ...base,
    conditions: { ...base.conditions, SPRINT: ["true", "false"] },
  };
  assert.ok(validateRuleForm(both).conditions);
  assert.equal(
    validateRuleForm({
      ...base,
      conditions: { ...base.conditions, DEADLINE: ["true"] },
    }).conditions,
    undefined,
  );
});

test("동작마다 쓰는 필드만 보낸다", () => {
  const move = formToRequest({
    ...base,
    action: "MOVE_STATUS",
    status: "IN_PROGRESS",
    days: "3",
    webhookUrl: "https://example.com",
  });
  assert.equal(move.status, "IN_PROGRESS");
  assert.equal(move.days, null);
  assert.equal(move.webhookUrl, null);
  assert.equal(move.mentions, null);

  const deadline = formToRequest({
    ...base,
    action: "SET_DEADLINE",
    days: "0",
  });
  assert.equal(deadline.days, 0);

  const agent = formToRequest({
    ...base,
    action: "ASSIGN_TO_AGENT",
    days: "",
    messageTemplate: " {task.key} 원인 조사 ",
  });
  assert.equal(agent.days, null);
  assert.equal(agent.messageTemplate, "{task.key} 원인 조사");

  const comment = formToRequest({
    ...base,
    action: "ADD_COMMENT",
    messageTemplate: "확인해 주세요",
    mentions: { assignees: true, reviewers: false, pm: false },
  });
  assert.equal(comment.messageTemplate, "확인해 주세요");
  assert.equal(comment.mentions, null);

  const subtask = formToRequest({
    ...base,
    action: "CREATE_SUBTASK",
    titleTemplate: "{task.key} 후속",
  });
  assert.equal(subtask.titleTemplate, "{task.key} 후속");

  const sprint = formToRequest({
    ...base,
    action: "ADD_TO_SPRINT",
    sprintId: "",
  });
  assert.equal(sprint.sprintId, null);
});

test("Discord 알림은 채널과 요약 시각을 기본값이 아닐 때만 보낸다", () => {
  const plain = formToRequest(base);
  assert.equal(plain.channel, null);
  assert.equal(plain.digestHour, null);
  const team = formToRequest({ ...base, channel: "TEAM", digestHour: 18 });
  assert.equal(team.channel, "TEAM");
  assert.equal(team.digestHour, 18);
  assert.equal(
    actionText({
      ...teamRule,
      action: "NOTIFY_DISCORD",
      channel: "TEAM",
      digestHour: 18,
      mentions: { assignees: false, reviewers: false, pm: true },
    }),
    "Discord로 알림, 팀 채널, PM 멘션, 매일 18시 요약",
  );
});

test("DM 은 받는 사람이 하나는 있어야 하고 업무 없는 이벤트는 PM 만 고른다", () => {
  const nobody = {
    ...base,
    action: "DISCORD_DM" as const,
    mentions: { assignees: false, reviewers: false, pm: false },
  };
  assert.ok(validateRuleForm(nobody).dmUserId);
  assert.equal(
    validateRuleForm({ ...nobody, dmUserId: "U1" }).dmUserId,
    undefined,
  );
  const service = formToRequest({
    ...nobody,
    event: "SERVICE_DOWN",
    mentions: { assignees: true, reviewers: true, pm: true },
    dmUserId: "U2",
  });
  assert.deepEqual(service.mentions, {
    assignees: false,
    reviewers: false,
    pm: true,
  });
  assert.equal(service.dmUserId, "U2");
  assert.ok(
    validateRuleForm({
      ...nobody,
      event: "SERVICE_DOWN",
      mentions: { assignees: true, reviewers: false, pm: false },
    }).dmUserId,
  );
});

test("이벤트마다 맞는 동작만 고르고, 팀 규칙은 프로젝트 대상 동작을 뺀다", () => {
  assert.deepEqual(allowedActions("SERVICE_RECOVERED"), [
    "NOTIFY_DISCORD",
    "DISCORD_DM",
    "WEBHOOK",
    "ADD_INCIDENT_NOTE",
  ]);
  assert.ok(allowedActions("SERVICE_DEGRADED").includes("CREATE_INCIDENT"));
  assert.ok(!allowedActions("SERVICE_DEGRADED").includes("ESCALATE"));
  assert.ok(allowedActions("SERVICE_DOWN").includes("ESCALATE"));
  assert.ok(!allowedActions("TASK_BLOCKED").includes("CREATE_INCIDENT"));
  const team = allowedActions("TASK_BLOCKED", "TEAM");
  for (const action of [
    "MOVE_BUCKET",
    "ASSIGN_REVIEWER",
    "ASSIGN_USER",
  ] as const)
    assert.ok(!team.includes(action), action);
  assert.ok(team.includes("ADD_TO_SPRINT"));
  assert.equal(
    changeEvent({ ...base, action: "MOVE_BUCKET" }, "TASK_BLOCKED", "TEAM")
      .action,
    "NOTIFY_DISCORD",
  );
  assert.equal(
    changeEvent({ ...base, action: "ESCALATE" }, "SERVICE_RECOVERED").action,
    "NOTIFY_DISCORD",
  );
});

test("팀 규칙 본문은 프로젝트마다 다른 대상을 빼고 프로젝트 필터를 정렬해 보낸다", () => {
  const form: RuleForm = {
    ...base,
    action: "ADD_TO_SPRINT",
    sprintId: "S1",
    bucketId: "B1",
    conditions: {
      ...base.conditions,
      PART: ["A1"],
      BUCKET: ["B1"],
      SIZE: ["M"],
    },
    projectIds: ["P2", "P1"],
  };
  const team = formToRequest(form, "TEAM");
  assert.equal(team.sprintId, null);
  assert.equal(team.bucketId, null);
  assert.deepEqual(team.conditions, [{ field: "SIZE", value: "M" }]);
  assert.deepEqual(team.projectIds, ["P1", "P2"]);
  assert.deepEqual(
    formToRequest({ ...form, projectIds: [] }, "TEAM").projectIds,
    null,
  );
  const project = formToRequest(form);
  assert.equal(project.sprintId, "S1");
  assert.equal(project.projectIds, null);
});

test("저장된 팀 규칙을 다시 켜면 범위, 필터, 단계를 그대로 돌려보낸다", () => {
  const form = ruleToForm(teamRule);
  assert.deepEqual(form.projectIds, ["P2", "P1"]);
  assert.deepEqual(form.escalation, [
    { afterHours: "4", notify: "ASSIGNEE" },
    { afterHours: "24", notify: "PM" },
    { afterHours: "48", notify: "LEAD" },
  ]);
  const body = toggleRequest(teamRule, true);
  assert.equal(body.enabled, true);
  assert.deepEqual(body.projectIds, ["P1", "P2"]);
  assert.deepEqual(body.escalation, teamRule.escalation);
  assert.deepEqual(body.conditions, [
    { field: "SIZE", value: "L" },
    { field: "SPRINT", value: "true" },
  ]);
  assert.equal(
    actionText(teamRule),
    "에스컬레이션: 4시간 담당자, 24시간 PM, 48시간 헤드 어드민",
  );
  assert.equal(
    disabledReasonText("CONSECUTIVE_FAILURES"),
    "연속 5회 실패해서 꺼졌어요.",
  );
  assert.equal(disabledReasonText("NEW_REASON"), "자동으로 꺼졌어요.");
});

test("에스컬레이션은 1~3단계, 1~168시간, 오름차순이다", () => {
  const ok = [
    { afterHours: "4", notify: "ASSIGNEE" as const },
    { afterHours: "24", notify: "PM" as const },
  ];
  assert.equal(escalationProblem(ok, "TASK_BLOCKED"), null);
  assert.ok(escalationProblem([], "TASK_BLOCKED"));
  assert.ok(escalationProblem([...ok, ...ok], "TASK_BLOCKED"));
  assert.ok(
    escalationProblem([{ afterHours: "0", notify: "PM" }], "TASK_BLOCKED"),
  );
  assert.ok(
    escalationProblem([{ afterHours: "169", notify: "PM" }], "TASK_BLOCKED"),
  );
  assert.ok(
    escalationProblem([{ afterHours: "1.5", notify: "PM" }], "TASK_BLOCKED"),
  );
  assert.ok(
    escalationProblem([{ afterHours: "", notify: "PM" }], "TASK_BLOCKED"),
  );
  assert.ok(
    escalationProblem(
      [
        { afterHours: "24", notify: "PM" },
        { afterHours: "24", notify: "LEAD" },
      ],
      "TASK_BLOCKED",
    ),
  );
  // 업무 없는 이벤트에는 담당자가 없다.
  assert.ok(escalationProblem(ok, "SERVICE_DOWN"));
  assert.equal(
    escalationProblem([{ afterHours: "1", notify: "LEAD" }], "SERVICE_DOWN"),
    null,
  );
  const form = { ...base, action: "ESCALATE" as const, escalation: ok };
  assert.deepEqual(validateRuleForm(form), {});
  assert.deepEqual(formToRequest(form).escalation, [
    { afterHours: 4, notify: "ASSIGNEE" },
    { afterHours: 24, notify: "PM" },
  ]);
});

test("웹훅 주소는 https 이고 사용자 정보가 없어야 한다", () => {
  assert.equal(webhookUrlProblem("https://n8n.example.com/webhook/hub"), null);
  // 내부 허용 목록은 서버만 안다. http 는 서버 판정에 맡긴다.
  assert.equal(webhookUrlProblem("http://n8n:5678/webhook/hub"), null);
  assert.ok(webhookUrlProblem(""));
  assert.ok(webhookUrlProblem("n8n.example.com"));
  assert.ok(webhookUrlProblem("ftp://example.com"));
  assert.ok(webhookUrlProblem("https://user:pw@example.com"));
  assert.ok(webhookUrlProblem(`https://example.com/${"a".repeat(500)}`));
  assert.equal(
    formToRequest({
      ...base,
      action: "WEBHOOK",
      webhookUrl: " https://example.com/h ",
    }).webhookUrl,
    "https://example.com/h",
  );
});

test("웹훅 비밀값은 받은 규칙에서 떼어 내고 본문이나 폼에 남기지 않는다", () => {
  const created: AutomationRule = {
    ...teamRule,
    action: "WEBHOOK",
    webhookUrl: "https://example.com/h",
    webhookSecret: "whsec_abc",
  };
  const { value, secret } = stripWebhookSecret(created);
  assert.equal(secret, "whsec_abc");
  assert.ok(!("webhookSecret" in value));
  assert.equal(
    stripWebhookSecret({ ...created, webhookSecret: null }).secret,
    null,
  );
  assert.ok(!JSON.stringify(toggleRequest(created, true)).includes("whsec_"));
  assert.ok(!JSON.stringify(ruleToForm(created)).includes("whsec_"));
  assert.equal(actionText(created), "웹훅 보내기: example.com");
});

test("새 실행 결과 code 와 오류 code 는 한국어 문장이다", () => {
  for (const code of [
    "REVIEW_NOT_ALLOWED",
    "NO_ACTIVE_SPRINT",
    "DEADLINE_ALREADY_SET",
    "DISCORD_NOT_LINKED",
    "CHANNEL_NOT_ALLOWED",
    "DIGEST_QUEUED",
    "WEBHOOK_BLOCKED",
    "WEBHOOK_FAILED",
    "INCIDENT_ALREADY_OPEN",
    "NO_OPEN_INCIDENT",
  ]) {
    const message = resultMessage(code, "SKIPPED");
    assert.ok(message && !message.includes(code), code);
  }
  assert.equal(
    resultMessage(
      "ALREADY_APPLIED",
      "SKIPPED",
      "TASK_BLOCKED",
      "ASSIGN_TO_AGENT",
    ),
    "이미 에이전트 대기열에 있어요.",
  );
  assert.equal(
    resultMessage(
      "TASK_NOT_ELIGIBLE",
      "SKIPPED",
      "TASK_CREATED",
      "ASSIGN_TO_AGENT",
    ),
    "완료되었거나 삭제된 업무라 대기열에 넣지 않았어요.",
  );
  assert.equal(
    resultMessage(
      "RULE_ACTION_TARGET_MISSING",
      "FAILED",
      "SERVICE_DOWN",
      "CREATE_INCIDENT",
    ),
    "서비스가 삭제되었거나 보관되었어요.",
  );
  assert.equal(
    resultMessage(
      "PRIVATE_SOURCE_RESTRICTED",
      "SKIPPED",
      "TASK_BLOCKED",
      "CREATE_SUBTASK",
    ),
    "비공개 원본 업무의 제목이 새 업무로 옮겨 가지 않게 업무를 만들지 않았어요.",
  );
  for (const code of [
    "RULE_SCOPE_OPTION_NOT_APPLICABLE",
    "RULE_WEBHOOK_URL_INVALID",
    "ACCESS_DENIED",
  ])
    assert.notEqual(ruleErrorMessage({ code, message: "raw" }), "raw", code);
});

test("웹훅 전달 기록은 시도 수와 마지막 응답을 한 줄로 쓴다", () => {
  assert.equal(
    deliveryText({ attempts: 5, httpStatus: 500, lastError: "HTTP 500" }),
    "5회 시도, 마지막 응답 HTTP 500",
  );
  assert.equal(
    deliveryText({ attempts: 2, httpStatus: null, lastError: "timeout" }),
    "2회 시도, 마지막 응답 timeout",
  );
  assert.equal(deliveryText({ attempts: 1 }), null);
});
