import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";
import { keepPreviousKey } from "@/shared/lib";

// 서버 계약: docs/spec/s5-home.md 3.4. 부하·역할은 조회자가 읽을 수 있는 업무·프로젝트로만 센다.
export type Member = {
  readonly id: string;
  readonly username: string;
  readonly name: string;
  readonly major: string | null;
  readonly avatarUrl: string | null;
  readonly role: "MEMBER" | "LEAD";
  readonly projects: readonly {
    readonly projectId: string;
    readonly key: string;
    readonly name: string;
    readonly pm: boolean;
    readonly parts: readonly {
      readonly id: string;
      readonly name: string;
      readonly leader: boolean;
    }[];
  }[];
  readonly load: { readonly inProgress: number; readonly reviewing: number };
  /** 본인 행과 헤드 어드민에게만 값이 있다. */
  readonly connections: {
    readonly github: boolean;
    readonly githubLogin: string | null;
    readonly discord: boolean;
  } | null;
};

export const memberQueries = {
  list: () =>
    queryOptions({
      queryKey: ["members"],
      queryFn: async () =>
        (await api.get<readonly Member[]>("/api/v1/members")).data,
      refetchInterval: BOARD_POLL_INTERVAL,
      placeholderData: keepPreviousKey(["members"]),
      retry: false,
    }),
};
