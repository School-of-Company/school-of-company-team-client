import type { CiStatus } from "@/entities/task";

export type PublicationState =
  "WAITING" | "PENDING" | "IN_FLIGHT" | "UNCERTAIN" | "SUCCEEDED" | "FAILED";
export type TaskGithub = {
  readonly publication: {
    readonly projectRepositoryId: string;
    readonly repositoryFullName: string;
    readonly publiclyVisible: boolean;
    readonly state: PublicationState;
    readonly attempts: number;
    readonly errorCode: string | null;
    readonly errorMessage: string | null;
    readonly updatedAt: string;
  } | null;
  // 저장소 자동 가져오기로 만든 업무만 non-null.
  readonly source: {
    readonly repositoryFullName: string;
    readonly private: boolean;
    readonly number: number;
    readonly url: string;
    readonly importedAt: string;
    readonly discordRestricted: boolean;
  } | null;
  readonly links: readonly {
    readonly id: string;
    readonly kind: "ISSUE" | "PULL_REQUEST";
    readonly primary: boolean;
    readonly accessible: boolean;
    readonly repositoryFullName: string | null;
    readonly number: number | null;
    readonly title: string | null;
    readonly state: "OPEN" | "CLOSED" | "MERGED" | "DELETED" | null;
    readonly url: string | null;
    readonly sourceUpdatedAt: string | null;
    /** PR 신호. 웹훅을 받은 적 없거나 Issue·권한 없음이면 null(= "신호 없음"). */
    readonly pullRequest?: PullRequestSignal | null;
  }[];
};
export type PullRequestSignal = {
  readonly draft: boolean;
  readonly headSha: string;
  readonly mergedAt: string | null;
  readonly closedAt: string | null;
  readonly ci: {
    readonly status: CiStatus;
    readonly url: string;
    readonly completedAt: string | null;
  };
  readonly review: {
    readonly requested: readonly {
      readonly githubLogin: string;
      readonly userId: string | null;
      readonly name: string | null;
      readonly requestedAt: string | null;
    }[];
    readonly approvals: number;
    readonly approved: boolean;
    readonly changesRequested: boolean;
  };
  readonly syncedAt: string;
};
export const linkStateLabels: Readonly<
  Record<"OPEN" | "CLOSED" | "MERGED" | "DELETED", string>
> = {
  OPEN: "열림",
  CLOSED: "닫힘",
  MERGED: "merge됨",
  DELETED: "삭제됨",
};
export type PublicationRepository = {
  readonly id: string;
  readonly repositoryId: number;
  readonly fullName: string;
  readonly private: boolean;
  readonly isDefault: boolean;
};
export const publicationLabels: Readonly<Record<PublicationState, string>> = {
  WAITING: "발행 예정",
  PENDING: "발행 중",
  IN_FLIGHT: "발행 중",
  UNCERTAIN: "결과 확인 중",
  SUCCEEDED: "발행 완료",
  FAILED: "발행 실패",
};
