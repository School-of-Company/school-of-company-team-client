import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api";

export interface UserSummary {
  readonly id: string;
  readonly username: string;
  readonly name: string;
}

export const activeUsersQueryKey = ["users", "active"] as const;

export const activeUsersQueryOptions = () => queryOptions({
  queryKey: activeUsersQueryKey,
  queryFn: async (): Promise<readonly UserSummary[]> => {
    const { data } = await api.get<readonly UserSummary[]>("/api/v1/users");
    return data;
  },
});
