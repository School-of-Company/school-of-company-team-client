import assert from "node:assert/strict";
import { test } from "node:test";
import { agentQueueLabel, type TaskAgentQueue } from "./agent-queue";

const item: TaskAgentQueue = {
  id: "Q1",
  status: "CLAIMED",
  note: null,
  dueAt: null,
  claimedBy: null,
  claimExpiresAt: "2026-11-26T10:30:00+09:00",
};
const before = Date.parse("2026-11-26T10:00:00+09:00");
const after = Date.parse("2026-11-26T11:00:00+09:00");

test("에이전트 대기열 문구: 대기, 진행, 선점 만료는 대기", () => {
  assert.equal(
    agentQueueLabel({ ...item, status: "QUEUED" }, before),
    "에이전트 대기 중",
  );
  assert.equal(agentQueueLabel(item, before), "에이전트 진행 중");
  assert.equal(agentQueueLabel(item, after), "에이전트 대기 중");
});
