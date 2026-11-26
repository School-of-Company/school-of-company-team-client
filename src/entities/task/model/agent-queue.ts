// 계약: 서버 docs/spec/s23-automation-v3.md 6절. 업무 상세에만 오고 보드 카드에는 없다.
export type TaskAgentQueue = {
  readonly id: string;
  readonly status: "QUEUED" | "CLAIMED";
  readonly note: string | null;
  readonly dueAt: string | null;
  readonly claimedBy: { readonly id: string; readonly name: string } | null;
  readonly claimExpiresAt: string | null;
};

/** 화면 문구. 선점 시간이 지난 CLAIMED 는 다시 대기로 본다(서버와 같은 판정). */
export function agentQueueLabel(item: TaskAgentQueue, now: number): string {
  const claimed =
    item.status === "CLAIMED" &&
    (!item.claimExpiresAt || Date.parse(item.claimExpiresAt) > now);
  return claimed ? "에이전트 진행 중" : "에이전트 대기 중";
}
