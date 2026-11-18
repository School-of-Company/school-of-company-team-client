import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { TaskStatus } from "@/entities/task";
import { api } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";

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

export const reviewRequestQueries = {
  mine: () =>
    queryOptions({
      queryKey: ["me", "github", "review-requests"],
      queryFn: async () =>
        (
          await api.get<readonly MyReviewRequest[]>(
            "/api/v1/me/github/review-requests",
          )
        ).data,
      refetchInterval: BOARD_POLL_INTERVAL,
      placeholderData: keepPreviousData,
      retry: false,
    }),
};
