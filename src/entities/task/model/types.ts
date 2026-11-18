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
  readonly assignees: readonly {
    readonly id: string;
    readonly username: string;
    readonly name: string;
  }[];
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
  } | null;
};
export type TaskDetail = TaskCard & {
  readonly description: string | null;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};
export type Board = {
  readonly groups: readonly {
    readonly key: string | null;
    readonly label: string;
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
  readonly deadline?: string;
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
  readonly blocked?: boolean;
  readonly blockedReason?: string;
};
export type MoveTask = {
  readonly status: TaskStatus;
  readonly prevId: string | null;
  readonly nextId: string | null;
};
