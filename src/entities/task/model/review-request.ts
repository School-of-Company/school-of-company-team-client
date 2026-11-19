import type { TaskStatus } from "./types";

/** 내 GitHub 계정에 걸린 열린 리뷰 요청(`GET /api/v1/me/github/review-requests`, Home `reviewRequests`). */
export type MyReviewRequest = {
  readonly repositoryFullName: string;
  readonly number: number;
  readonly title: string;
  readonly url: string;
  readonly draft: boolean;
  readonly requestedAt: string;
  /** 요청 후 24시간 경과(알림 '리뷰 24시간 초과'와 같은 기준). */
  readonly overdue: boolean;
  readonly tasks: readonly {
    readonly id: string;
    readonly key: string | null;
    readonly title: string;
    readonly status: TaskStatus;
    readonly projectId: string | null;
  }[];
};
