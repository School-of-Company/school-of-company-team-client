import type { TaskStatus } from "@/entities/task/@x/sprint";

// 계약: 서버 docs/spec/s4-sprint.md. 개수는 모두 조회자 기준(읽기 정책 적용 후)이다.

export type SprintStatus = "PLANNED" | "ACTIVE" | "CLOSED";
export type CarryOverTarget = "SPRINT" | "BUCKET" | "NONE";
export type RetroKind = "KEEP" | "PROBLEM" | "TRY";

export const sprintStatusLabels: Readonly<Record<SprintStatus, string>> = {
  PLANNED: "예정",
  ACTIVE: "진행 중",
  CLOSED: "종료",
};
export const retroKinds = ["KEEP", "PROBLEM", "TRY"] as const;
export const retroKindLabels: Readonly<Record<RetroKind, string>> = {
  KEEP: "Keep",
  PROBLEM: "Problem",
  TRY: "Try",
};

export type Sprint = {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly goal: string | null;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: SprintStatus;
  readonly startedAt: string | null;
  readonly closedAt: string | null;
  readonly counts: Readonly<Partial<Record<TaskStatus, number>>>;
  readonly createdAt: string;
  readonly updatedAt: string;
};
export type SprintSummary = {
  readonly id: string;
  readonly name: string;
  readonly status: SprintStatus;
};
export type SprintPerson = {
  readonly id: string;
  readonly username: string;
  readonly name: string;
  readonly avatarUrl?: string | null;
};
export type CarryOver = {
  readonly task: {
    readonly id: string;
    readonly key: string;
    readonly title: string;
    readonly status: TaskStatus;
  };
  readonly target: CarryOverTarget;
  readonly toSprint: SprintSummary | null;
  readonly toBucket: {
    readonly id: string;
    readonly name: string;
    readonly archived: boolean;
  } | null;
  readonly carriedBy: SprintPerson;
  readonly carriedAt: string;
};
export type SprintReview = {
  readonly sprintId: string;
  readonly body: string;
  readonly updatedBy: SprintPerson;
  readonly updatedAt: string;
  readonly publishedAt: string | null;
  readonly publishedBy: SprintPerson | null;
};
export type RetroEntry = {
  readonly id: string;
  readonly sprintId: string;
  readonly kind: RetroKind;
  readonly author: SprintPerson;
  readonly body: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type SprintInput = {
  readonly name: string;
  readonly goal: string;
  readonly startDate: string;
  readonly endDate: string;
};
export type CarryOverDestination = {
  readonly target: CarryOverTarget;
  readonly sprintId?: string;
  readonly bucketId?: string;
};
export type CloseSprint = {
  readonly defaultCarryOver: CarryOverDestination;
  readonly overrides: readonly (CarryOverDestination & {
    readonly taskId: string;
  })[];
};

/** 상태별 수 합계와 완료 수. 서버가 빈 상태를 생략해도 0으로 본다. */
export function sprintProgress(counts: Sprint["counts"]) {
  const total = Object.values(counts).reduce<number>(
    (sum, value) => sum + (value ?? 0),
    0,
  );
  return { total, done: counts.DONE ?? 0 };
}

/** 이월 대상 선택값을 문자열 하나로 다룬다: `SPRINT:<id>`, `BUCKET:<id>`, `NONE`. */
export function encodeDestination(destination: CarryOverDestination) {
  if (destination.target === "SPRINT")
    return `SPRINT:${destination.sprintId ?? ""}`;
  if (destination.target === "BUCKET")
    return `BUCKET:${destination.bucketId ?? ""}`;
  return "NONE";
}
export function decodeDestination(value: string): CarryOverDestination | null {
  if (value === "NONE") return { target: "NONE" };
  const [target, id] = value.split(":");
  if (!id) return null;
  if (target === "SPRINT") return { target, sprintId: id };
  if (target === "BUCKET") return { target, bucketId: id };
  return null;
}

/** 종료 요청: 기본 대상과 다른 행만 예외로 보낸다(볼 수 없는 업무는 기본 대상으로 간다). */
export function closeSprintRequest(
  fallback: string,
  rows: Readonly<Record<string, string>>,
): CloseSprint | null {
  const defaultCarryOver = decodeDestination(fallback);
  if (!defaultCarryOver) return null;
  const overrides = Object.entries(rows).flatMap(([taskId, value]) => {
    if (!value || value === fallback) return [];
    const destination = decodeDestination(value);
    return destination ? [{ taskId, ...destination }] : [];
  });
  return { defaultCarryOver, overrides };
}

/** 오늘(Asia/Seoul) `YYYY-MM-DD`. */
export function seoulToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    now,
  );
}
export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
/** 새 Sprint 기본 기간: 가장 늦게 끝나는 Sprint 다음 날부터 2주, 없으면 오늘부터. */
export function nextSprintDates(
  sprints: readonly Pick<Sprint, "endDate" | "status">[],
  today = seoulToday(),
) {
  const latest = sprints
    .filter((sprint) => sprint.status !== "CLOSED")
    .map((sprint) => sprint.endDate)
    .sort()
    .at(-1);
  const startDate = latest && latest >= today ? addDays(latest, 1) : today;
  return { startDate, endDate: addDays(startDate, 13) };
}

const errors: Readonly<Record<string, string>> = {
  SPRINT_NOT_FOUND: "Sprint를 찾을 수 없습니다. 목록을 다시 확인하세요.",
  DUPLICATE_SPRINT_NAME: "같은 이름의 Sprint가 있습니다. 다른 이름을 쓰세요.",
  SPRINT_ALREADY_ACTIVE:
    "이미 진행 중인 Sprint가 있습니다. 그 Sprint를 종료한 뒤 시작하세요.",
  SPRINT_NOT_PLANNED: "예정 상태의 Sprint만 시작하거나 삭제할 수 있습니다.",
  SPRINT_NOT_ACTIVE:
    "진행 중인 Sprint만 종료할 수 있습니다. 그 사이 종료됐는지 확인하세요.",
  SPRINT_NOT_STARTED: "Sprint를 시작한 뒤에 쓸 수 있습니다.",
  SPRINT_CLOSED: "종료된 Sprint는 바꿀 수 없습니다.",
  SPRINT_TASK_NOT_IN_PROJECT: "이 프로젝트의 업무만 넣을 수 있습니다.",
  TASK_NOT_IN_SPRINT: "이미 Sprint에서 빠진 업무입니다.",
  STALE_SPRINT_SCOPE:
    "그 사이 Sprint 업무가 바뀌었습니다. 최신 목록을 보고 다시 시도하세요.",
  INVALID_CARRY_OVER_TARGET:
    "이월 대상이 올바르지 않습니다. 예정 Sprint 또는 사용 중인 버킷을 고르세요.",
  SPRINT_REVIEW_NOT_FOUND: "저장된 리뷰가 없습니다. 먼저 저장하세요.",
  RETRO_ENTRY_NOT_FOUND: "이미 삭제된 회고 항목입니다.",
  RETRO_ENTRY_FORBIDDEN: "작성자만 고칠 수 있습니다.",
  INVALID_SCOPE: "프로젝트 업무만 Sprint·Milestone에 넣을 수 있습니다.",
  TASK_NOT_FOUND: "업무를 찾을 수 없거나 볼 수 없습니다.",
  PROJECT_FORBIDDEN: "이 작업을 할 권한이 없습니다.",
  PROJECT_ARCHIVED: "아카이브된 프로젝트는 조회만 가능합니다.",
  PROJECT_NOT_FOUND: "프로젝트가 없거나 볼 수 없습니다.",
};
export function sprintErrorMessage(error: {
  readonly code: string;
  readonly message: string;
}) {
  return errors[error.code] ?? error.message;
}
