import type { DevSignal } from "./dev-signal";

export const taskStatuses = [
  "BACKLOG",
  "PLANNED",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
] as const;
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskType = "TASK" | "DEV";
export type TaskScope = "PROJECT" | "TEAM" | "PERSONAL";
export type TaskPriority = "P0" | "P1" | "P2" | "P3";
export const priorityLabels: Readonly<Record<TaskPriority, string>> = {
  P0: "긴급",
  P1: "높음",
  P2: "보통",
  P3: "낮음",
};
export const statusLabels: Readonly<Record<TaskStatus, string>> = {
  BACKLOG: "검토 필요",
  PLANNED: "진행 예정",
  IN_PROGRESS: "진행 중",
  REVIEW: "리뷰",
  DONE: "완료",
};
export type TaskPerson = {
  readonly id: string;
  readonly username: string;
  readonly name: string;
};
export type TaskBucket = {
  readonly id: string;
  readonly name: string;
  readonly archived: boolean;
};
export type TaskCard = {
  readonly id: string;
  readonly key: string | null;
  readonly scope: TaskScope;
  readonly projectId: string | null;
  readonly projectKey: string | null;
  readonly projectName: string | null;
  readonly seq: number | null;
  readonly part: { readonly id: string; readonly name: string } | null;
  readonly title: string;
  readonly type: TaskType;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly assignees: readonly TaskPerson[];
  /** 단계 3: 서버가 아직 보내지 않으면 없을 수 있다. */
  readonly planningBucket?: TaskBucket | null;
  readonly reviewers?: readonly TaskPerson[];
  /** YYYY-MM-DD, 마감일 이하. 서버가 아직 보내지 않으면 없을 수 있다. */
  readonly startDate?: string | null;
  readonly deadline: string | null;
  readonly blocked: boolean;
  readonly blockedReason: string | null;
  readonly position: number;
  readonly completedAt: string | null;
  /** Linked GitHub issue/PR; sent by the board API from feat/board-card-issue. */
  readonly issue?: {
    readonly repositoryFullName: string;
    readonly number: number;
    readonly kind: "ISSUE" | "PR";
    readonly url?: string;
    readonly private?: boolean;
  } | null;
  /** 열린 PR의 CI·리뷰 요약. 신호가 없거나 서버가 아직 보내지 않으면 null/없음. */
  readonly devSignal?: DevSignal | null;
};
export type TaskDetail = Omit<TaskCard, "reviewers"> & {
  readonly reviewers?: readonly (TaskPerson & {
    readonly githubLogin?: string | null;
    readonly assignedAt?: string;
  })[];
  readonly description: string | null;
  /** 단계 4: 열린 Sprint 소속(없으면 null). 서버가 아직 보내지 않으면 없을 수 있다. */
  readonly sprint?: {
    readonly id: string;
    readonly name: string;
    readonly status: "PLANNED" | "ACTIVE" | "CLOSED";
  } | null;
  readonly milestone?: {
    readonly id: string;
    readonly name: string;
    readonly dueDate: string | null;
  } | null;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};
export type Board = {
  readonly groups: readonly {
    readonly key: string | null;
    readonly label: string;
    /** 레인의 상태별 고유 업무 수(DONE 자르기 전). */
    readonly counts?: Readonly<Record<TaskStatus, number>>;
    readonly columns: Readonly<Record<TaskStatus, readonly TaskCard[]>>;
  }[];
  readonly counts: Readonly<Record<TaskStatus, number>>;
};
export type CreateTask = {
  readonly scope: TaskScope;
  readonly projectId?: string;
  readonly title: string;
  readonly description?: string;
  readonly partId?: string;
  readonly assigneeIds: readonly string[];
  readonly type: TaskType;
  readonly priority: TaskPriority;
  readonly status: TaskStatus;
  readonly startDate?: string;
  readonly deadline?: string;
  readonly planningBucketId?: string;
  readonly reviewerIds?: readonly string[];
  readonly milestoneId?: string;
};
export type DeadlineUpdate =
  | { readonly deadline?: string; readonly clearDeadline?: false }
  | { readonly deadline?: never; readonly clearDeadline: true };
export type UpdateTask = DeadlineUpdate & {
  readonly title?: string;
  readonly description?: string;
  readonly type?: TaskType;
  readonly priority?: TaskPriority;
  readonly partId?: string;
  readonly assigneeIds?: readonly string[];
  /** null 은 시작일 해제. */
  readonly startDate?: string | null;
  /** 빈 문자열은 버킷 해제. */
  readonly planningBucketId?: string;
  /** 배열은 전체 교체, `[]`는 모두 해제. */
  readonly reviewerIds?: readonly string[];
  /** 빈 문자열은 Milestone 해제. */
  readonly milestoneId?: string;
  readonly blocked?: boolean;
  readonly blockedReason?: string;
};
export type MoveTask = {
  readonly status: TaskStatus;
  readonly prevId: string | null;
  readonly nextId: string | null;
  /** 버킷 레인 사이 이동. 빈 문자열은 "버킷 없음" 레인. */
  readonly planningBucketId?: string;
};
