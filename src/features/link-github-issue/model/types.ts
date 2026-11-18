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
  }[];
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
