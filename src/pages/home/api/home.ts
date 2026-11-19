import { queryOptions } from "@tanstack/react-query";
import type { MyReviewRequest, TaskCard, TaskStatus } from "@/entities/task";
import { api } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";
import { keepPreviousKey } from "@/shared/lib";

// 서버 계약: docs/spec/s5-home.md(feat/s5-home). 판정은 서버가 하고 화면은 보여 주기만 한다.
export const attentionRules = [
  "OVERDUE",
  "CI_FAILED",
  "REVIEW_OVERDUE",
  "BLOCKED_TOO_LONG",
  "HIGH_PRIORITY_UNASSIGNED",
  "DUE_SOON",
  "MERGED_NOT_DONE",
  // 단계 8: 자동화 규칙의 "확인 필요로 표시" 동작(계약 s8 8.1). 서버가 아직 보내지 않으면 묶음이 없다.
  "RULE_MARKED",
  "SPRINT_ENDING",
] as const;
export type AttentionRule = (typeof attentionRules)[number];

export type AttentionItem = {
  readonly rule: AttentionRule;
  readonly task: TaskCard | null;
  readonly sprint: {
    readonly id: string;
    readonly projectId: string;
    readonly projectKey: string;
    readonly name: string;
    readonly endDate: string;
    readonly openTaskCount: number;
  } | null;
  readonly pullRequest: {
    readonly repositoryFullName: string;
    readonly number: number;
    readonly title: string;
    readonly url: string;
    readonly reviewerLogin: string | null;
    readonly reviewerUserId: string | null;
  } | null;
  readonly since: string | null;
  readonly dueDate: string | null;
  /** RULE_MARKED 만 값이 있다. 표시한 자동화 규칙. */
  readonly automationRule?: {
    readonly id: string;
    readonly name: string;
  } | null;
};

export type Attention = {
  readonly items: readonly AttentionItem[];
  readonly counts: Readonly<Record<AttentionRule, number>>;
};

export type ActiveSprint = {
  readonly id: string;
  readonly projectId: string;
  readonly projectKey: string;
  readonly projectName: string;
  readonly name: string;
  readonly goal: string | null;
  readonly startDate: string;
  readonly endDate: string;
  readonly daysLeft: number;
  readonly counts: Readonly<Record<TaskStatus, number>>;
  readonly myOpenCount: number;
};

export type Home = {
  readonly today: {
    readonly inProgress: readonly TaskCard[];
    readonly dueSoon: readonly TaskCard[];
  };
  readonly attention: Attention;
  readonly activeSprints: readonly ActiveSprint[];
  readonly reviewRequests: readonly MyReviewRequest[];
  readonly generatedAt: string;
};

export const homeQueries = {
  mine: () =>
    queryOptions({
      queryKey: ["home"],
      queryFn: async () => (await api.get<Home>("/api/v1/home")).data,
      refetchInterval: BOARD_POLL_INTERVAL,
      placeholderData: keepPreviousKey(["home"]),
      retry: false,
    }),
  // 범위를 바꾸면 키가 바뀐다. 다른 범위의 목록을 placeholder로 보여 주지 않도록 keepPreviousData를 쓰지 않는다.
  project: (projectId: string) =>
    queryOptions({
      queryKey: ["projects", projectId, "attention"],
      queryFn: async () =>
        (
          await api.get<Attention>(
            `/api/v1/projects/${encodeURIComponent(projectId)}/attention`,
          )
        ).data,
      refetchInterval: BOARD_POLL_INTERVAL,
      retry: false,
    }),
};
