import type { SprintStatus } from "@/entities/sprint";

export type SprintTab = "plan" | "progress" | "review" | "retro";

export const sprintTabLabels: Readonly<Record<SprintTab, string>> = {
  plan: "계획",
  progress: "진행",
  review: "결과 보고",
  retro: "회고",
};

/** 종료된 Sprint는 범위를 바꿀 수 없어 계획 탭이 없다(진행 탭이 종료 결과·이월 기록을 보여 준다). */
export function sprintTabs(status: SprintStatus): readonly SprintTab[] {
  return status === "CLOSED"
    ? ["progress", "review", "retro"]
    : ["plan", "progress", "review", "retro"];
}

/** URL `?tab=`이 없거나 쓸 수 없으면 상태에 맞는 첫 화면: 예정=계획, 진행 중=진행, 종료=결과 보고. */
export function selectedSprintTab(
  status: SprintStatus,
  requested: string | null | undefined,
): SprintTab {
  const tabs = sprintTabs(status);
  const match = tabs.find((tab) => tab === requested);
  if (match) return match;
  return status === "PLANNED"
    ? "plan"
    : status === "ACTIVE"
      ? "progress"
      : "review";
}
