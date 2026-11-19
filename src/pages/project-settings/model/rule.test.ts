import assert from "node:assert/strict";
import { test } from "node:test";
import {
  actionText,
  allowedActions,
  brokenReferences,
  changeEvent,
  emptyRuleForm,
  formToRequest,
  resultMessage,
  ruleToForm,
  selectableEvents,
  toggleRequest,
  triggerText,
  validateRuleForm,
  type AutomationRule,
} from "./rule";

const rule: AutomationRule = {
  id: "R1",
  projectId: "P1",
  name: "P0 막힘이면 PM 호출",
  enabled: true,
  event: "TASK_BLOCKED",
  eventStatus: null,
  conditions: [
    { field: "PRIORITY", value: "P0", label: "P0" },
    { field: "PRIORITY", value: "P1", label: "P1" },
    { field: "PART", value: "A1", label: "백엔드" },
  ],
  action: "NOTIFY_DISCORD",
  bucket: null,
  reviewer: null,
  mentions: { assignees: true, reviewers: false, pm: true },
  lastRun: null,
  createdAt: "2026-11-19T10:00:00+09:00",
  updatedAt: "2026-11-19T10:00:00+09:00",
};

test("toggling sends the full definition back with only enabled changed", () => {
  assert.deepEqual(toggleRequest(rule, false), {
    name: rule.name,
    enabled: false,
    event: "TASK_BLOCKED",
    eventStatus: null,
    conditions: [
      { field: "PRIORITY", value: "P0" },
      { field: "PRIORITY", value: "P1" },
      { field: "PART", value: "A1" },
    ],
    action: "NOTIFY_DISCORD",
    bucketId: null,
    reviewerId: null,
    mentions: { assignees: true, reviewers: false, pm: true },
  });
});

test("fields that do not apply to the chosen event or action are not sent", () => {
  const form = {
    ...emptyRuleForm(),
    name: "  리뷰 진입 시 지정  ",
    event: "TASK_BLOCKED" as const,
    eventStatus: "REVIEW" as const,
    action: "ASSIGN_REVIEWER" as const,
    bucketId: "B1",
    reviewerId: "U2",
  };
  const body = formToRequest(form);
  assert.equal(body.name, "리뷰 진입 시 지정");
  assert.equal(body.eventStatus, null);
  assert.equal(body.bucketId, null);
  assert.equal(body.reviewerId, "U2");
  assert.equal(body.mentions, null);
  assert.equal(
    formToRequest({ ...form, event: "TASK_STATUS_CHANGED" }).eventStatus,
    "REVIEW",
  );
});

test("incident rules carry no conditions and can only mention the PM", () => {
  const form = {
    ...ruleToForm(rule),
    event: "INCIDENT_CREATED" as const,
  };
  const body = formToRequest(form);
  assert.deepEqual(body.conditions, []);
  assert.deepEqual(body.mentions, {
    assignees: false,
    reviewers: false,
    pm: true,
  });
  assert.deepEqual(allowedActions("INCIDENT_CREATED"), ["NOTIFY_DISCORD"]);
});

test("there is no status-changing or external write action, and the incident event is offered", () => {
  assert.deepEqual(allowedActions("TASK_STATUS_CHANGED"), [
    "NOTIFY_DISCORD",
    "MARK_ATTENTION",
    "ASSIGN_REVIEWER",
    "MOVE_BUCKET",
  ]);
  assert.equal(selectableEvents.at(-1), "INCIDENT_CREATED");
});

test("targets are required for move and reviewer actions", () => {
  const base = { ...emptyRuleForm(), name: "규칙" };
  assert.deepEqual(validateRuleForm(base), {});
  assert.ok(validateRuleForm({ ...base, name: "  " }).name);
  assert.ok(validateRuleForm({ ...base, action: "MOVE_BUCKET" }).bucketId);
  assert.ok(
    validateRuleForm({ ...base, action: "ASSIGN_REVIEWER" }).reviewerId,
  );
});

test("deleted parts, buckets and reviewers are flagged instead of silently dropped", () => {
  const broken: AutomationRule = {
    ...rule,
    conditions: [{ field: "PART", value: "A9", label: null }],
    action: "MOVE_BUCKET",
    bucket: null,
    mentions: null,
  };
  assert.deepEqual(brokenReferences(broken), [
    "삭제된 파트 조건",
    "삭제된 대상 버킷",
  ]);
  assert.deepEqual(ruleToForm(broken).conditions.PART, ["A9"]);
  assert.deepEqual(brokenReferences(rule), []);
});

test("summaries read as short Korean phrases", () => {
  assert.equal(triggerText(rule), "막힘으로 표시될 때");
  assert.equal(
    triggerText({ event: "TASK_STATUS_CHANGED", eventStatus: "REVIEW" }),
    "상태가 리뷰(으)로 바뀔 때",
  );
  assert.equal(actionText(rule), "Discord로 알림, 담당자, PM 멘션");
  assert.equal(resultMessage(null), null);
  assert.equal(
    resultMessage("DISCORD_CHANNEL_MISSING"),
    "보낼 업무 스레드나 프로젝트 채널이 없습니다.",
  );
  assert.equal(resultMessage("NEW_CODE"), "NEW_CODE");
  assert.equal(
    resultMessage("PRIVATE_SOURCE_RESTRICTED", "SKIPPED"),
    "비공개 원본 업무라 공유 채널에 게시하지 않았습니다.",
  );
  // 서버가 SKIPPED 사유를 새로 더해도 문장으로 보인다(M1: 비공개 원본 공유 채널 게시 금지).
  assert.equal(
    resultMessage("SHARING_RESTRICTED_TASK", "SKIPPED"),
    "비공개 원본 업무라 공유 채널에 게시하지 않았습니다.",
  );
  assert.equal(
    resultMessage("SOMETHING_NEW", "SKIPPED"),
    "조건이 맞지 않아 실행하지 않았습니다(SOMETHING_NEW).",
  );
  assert.equal(
    resultMessage("SOMETHING_NEW", "FAILED"),
    "실행하지 못했습니다(SOMETHING_NEW).",
  );
});

test("switching a bucket rule with conditions to the incident event resets the action and sends no task fields", () => {
  const form = changeEvent(
    {
      ...ruleToForm(rule),
      action: "MOVE_BUCKET",
      bucketId: "B1",
    },
    "INCIDENT_CREATED",
  );
  assert.equal(form.action, "NOTIFY_DISCORD");
  // 조건은 폼에 남아(다시 업무 이벤트로 돌리면 보인다) 보낼 때만 빠진다.
  assert.deepEqual(form.conditions.PRIORITY, ["P0", "P1"]);
  const body = formToRequest(form);
  assert.deepEqual(body.conditions, []);
  assert.equal(body.bucketId, null);
  assert.deepEqual(body.mentions, {
    assignees: false,
    reviewers: false,
    pm: true,
  });
  assert.equal(changeEvent(form, "TASK_BLOCKED").action, "NOTIFY_DISCORD");
});

test("toggling an incident rule sends a body the server accepts", () => {
  const incidentRule: AutomationRule = {
    ...rule,
    event: "INCIDENT_CREATED",
    conditions: [],
    mentions: { assignees: false, reviewers: false, pm: true },
  };
  const body = toggleRequest(incidentRule, false);
  assert.equal(body.enabled, false);
  assert.deepEqual(body.conditions, []);
  assert.equal(body.action, "NOTIFY_DISCORD");
  assert.deepEqual(body.mentions, {
    assignees: false,
    reviewers: false,
    pm: true,
  });
});

test("incident runs explain reasons without task wording", () => {
  assert.equal(
    resultMessage("TASK_NOT_ELIGIBLE", "SKIPPED", "INCIDENT_CREATED"),
    "사고가 삭제되었습니다.",
  );
  assert.equal(
    resultMessage("DISCORD_CHANNEL_MISSING", "SKIPPED", "INCIDENT_CREATED"),
    "Discord 프로젝트 채널이 연결되지 않았습니다.",
  );
  assert.equal(
    resultMessage("TASK_NOT_ELIGIBLE", "SKIPPED", "TASK_BLOCKED"),
    "업무가 삭제되었거나 프로젝트 업무가 아닙니다.",
  );
});
