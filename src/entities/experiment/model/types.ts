// 서버 계약: 실험실(feat/experiments-team-guide). 판정·권한은 서버가 하고 화면은 보여 주기만 한다.
export const experimentStatuses = [
  "PLANNED",
  "RUNNING",
  "DONE",
  "STOPPED",
] as const;
export type ExperimentStatus = (typeof experimentStatuses)[number];

export const experimentOutcomes = [
  "SUCCESS",
  "FAILURE",
  "INCONCLUSIVE",
] as const;
export type ExperimentOutcome = (typeof experimentOutcomes)[number];

/** 목록 필터. ACTIVE = 계획·진행 중, DONE = 완료·중단. */
export type ExperimentView = "ACTIVE" | "DONE" | "ALL";

export const statusLabels: Readonly<Record<ExperimentStatus, string>> = {
  PLANNED: "계획",
  RUNNING: "진행 중",
  DONE: "완료",
  STOPPED: "중단",
};

export const outcomeLabels: Readonly<Record<ExperimentOutcome, string>> = {
  SUCCESS: "성공",
  FAILURE: "실패",
  INCONCLUSIVE: "판단 보류",
};

export type ExperimentPerson = {
  readonly id: string;
  readonly username: string;
  readonly name: string;
  readonly avatarUrl?: string | null;
};

export type ExperimentLinkKind = "TASK" | "DOCUMENT";

export type ExperimentLink = {
  readonly kind: ExperimentLinkKind;
  readonly id: string;
  readonly title: string;
  readonly key: string | null;
};

export type Experiment = {
  readonly id: string;
  readonly title: string;
  readonly hypothesis: string;
  readonly method: string;
  readonly metric: string;
  readonly status: ExperimentStatus;
  readonly outcome: ExperimentOutcome | null;
  readonly result: string;
  readonly learnings: string;
  readonly owner: ExperimentPerson | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly finishedAt: string | null;
  readonly promotedProjectId: string | null;
  readonly links: readonly ExperimentLink[];
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
};

export type CreateExperiment = {
  readonly title: string;
  readonly hypothesis: string;
  readonly method?: string;
  readonly metric?: string;
  readonly ownerId?: string;
  readonly startDate?: string;
  readonly endDate?: string;
};

export type UpdateExperiment = {
  readonly title?: string;
  readonly hypothesis?: string;
  readonly method?: string;
  readonly metric?: string;
  readonly result?: string;
  readonly learnings?: string;
  readonly ownerId?: string | null;
  readonly startDate?: string | null;
  readonly endDate?: string | null;
  readonly promotedProjectId?: string | null;
};

/** 앱 안의 업무·문서 주소(또는 ID만)에서 연결 대상을 읽는다. 못 읽으면 null. */
export function parseLinkTarget(
  input: string,
): { readonly kind: ExperimentLinkKind; readonly targetId: string } | null {
  const value = input.trim();
  if (!value) return null;
  const path = (() => {
    try {
      return new URL(value).pathname;
    } catch {
      return value;
    }
  })();
  const match = /^\/?(tasks|docs)\/([A-Za-z0-9]+)\/?$/.exec(path);
  if (!match) return null;
  return {
    kind: match[1] === "tasks" ? "TASK" : "DOCUMENT",
    targetId: match[2] as string,
  };
}
