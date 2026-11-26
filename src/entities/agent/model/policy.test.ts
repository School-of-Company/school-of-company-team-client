import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activityParams,
  hasPolicyErrors,
  policyDraft,
  policyRequest,
  resultLabel,
  validatePolicy,
  type AgentPolicy,
} from "./policy";

const policy: AgentPolicy = {
  mcpEnabled: true,
  allowWriteTokens: true,
  maxTokenDays: 90,
  allowedProjects: null,
  areas: {
    TASKS: "WRITE",
    COMMENTS: "WRITE",
    SPRINTS: "WRITE",
    MILESTONES: "WRITE",
    DOCUMENTS: "WRITE",
    WHITEBOARDS: "READ",
    OPS_INCIDENTS: "READ",
    INTAKE: "READ",
    STATS: "READ",
  },
  maxAccess: {
    TASKS: "WRITE",
    COMMENTS: "WRITE",
    SPRINTS: "WRITE",
    MILESTONES: "WRITE",
    DOCUMENTS: "WRITE",
    WHITEBOARDS: "READ",
    OPS_INCIDENTS: "WRITE",
    INTAKE: "WRITE",
    STATS: "READ",
  },
  updatedAt: null,
  updatedBy: null,
};

test("an untouched default policy is valid", () => {
  assert.equal(
    hasPolicyErrors(validatePolicy(policyDraft(policy), policy.maxAccess)),
    false,
  );
});

test("areas above their max level are rejected per area", () => {
  const draft = {
    ...policyDraft(policy),
    areas: {
      ...policy.areas,
      WHITEBOARDS: "WRITE",
      STATS: "WRITE",
      INTAKE: "WRITE",
    },
  } as const;
  const errors = validatePolicy(draft, policy.maxAccess);
  assert.deepEqual(Object.keys(errors.areas ?? {}).sort(), [
    "STATS",
    "WHITEBOARDS",
  ]);
  assert.equal(errors.maxTokenDays, undefined);
});

test("maxTokenDays must be a whole number from 1 to 90", () => {
  for (const value of ["0", "91", "1.5", "", "abc", "-3"])
    assert.ok(
      validatePolicy(
        { ...policyDraft(policy), maxTokenDays: value },
        policy.maxAccess,
      ).maxTokenDays,
      value,
    );
  for (const value of ["1", "90", " 30 "])
    assert.equal(
      validatePolicy(
        { ...policyDraft(policy), maxTokenDays: value },
        policy.maxAccess,
      ).maxTokenDays,
      undefined,
      value,
    );
});

test("policy request maps ALL to null, dedupes ids and sends only changed areas", () => {
  assert.deepEqual(policyRequest(policyDraft(policy), policy), {
    mcpEnabled: true,
    allowWriteTokens: true,
    maxTokenDays: 90,
    allowedProjectIds: null,
    areas: {},
  });
  const draft = {
    ...policyDraft(policy),
    allowWriteTokens: false,
    maxTokenDays: " 30",
    allProjects: false,
    projectIds: ["p1", "p2", "p1"],
    areas: { ...policy.areas, INTAKE: "OFF", OPS_INCIDENTS: "WRITE" },
  } as const;
  assert.deepEqual(policyRequest(draft, policy), {
    mcpEnabled: true,
    allowWriteTokens: false,
    maxTokenDays: 30,
    allowedProjectIds: ["p1", "p2"],
    areas: { OPS_INCIDENTS: "WRITE", INTAKE: "OFF" },
  });
});

test("an empty project list stays a list (nothing allowed), not ALL", () => {
  const draft = { ...policyDraft(policy), allProjects: false, projectIds: [] };
  assert.deepEqual(policyRequest(draft, policy).allowedProjectIds, []);
  assert.deepEqual(
    policyDraft({
      ...policy,
      allowedProjects: [{ id: "p1", key: "HUB", name: "Hub" }],
    }),
    { ...policyDraft(policy), allProjects: false, projectIds: ["p1"] },
  );
});

test("activity params drop empty filters and keep the limit", () => {
  assert.equal(
    activityParams({
      userId: "",
      tool: " create_task ",
      from: "2026-11-01",
    }).toString(),
    "tool=create_task&from=2026-11-01&limit=100",
  );
});

test("policy request never sends blank project ids (server rejects nulls with 400)", () => {
  const draft = {
    ...policyDraft(policy),
    allProjects: false,
    projectIds: ["p1", " ", "", " p2 "],
  };
  const body = policyRequest(draft, policy);
  assert.deepEqual(body.allowedProjectIds, ["p1", "p2"]);
  assert.ok(Object.values(body.areas).every((value) => value !== null));
});

test("result codes read as Korean labels, unknown codes stay as-is", () => {
  assert.equal(resultLabel("OK"), "성공");
  assert.equal(resultLabel("GITHUB_NOT_PULL_REQUEST"), "PR이 아닌 번호");
  assert.equal(resultLabel("AGENT_POLICY_DENIED"), "팀 정책으로 막힘");
  assert.equal(resultLabel("SOMETHING_NEW"), "SOMETHING_NEW");
});
