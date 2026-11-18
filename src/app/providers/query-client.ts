import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: BOARD_POLL_INTERVAL,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          if (
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500
          )
            return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}
