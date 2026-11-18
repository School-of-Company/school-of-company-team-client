import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { MyReviewRequest } from "@/entities/task";
import { api } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";

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
