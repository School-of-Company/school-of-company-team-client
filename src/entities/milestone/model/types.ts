// 계약: 서버 docs/spec/s4-sprint.md 의 Milestone 절. 진행률은 조회자가 볼 수 있는 업무만 센다.

export type Milestone = {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly description: string | null;
  readonly dueDate: string | null;
  readonly progress: { readonly total: number; readonly done: number };
  readonly createdAt: string;
  readonly updatedAt: string;
};
export type MilestoneSummary = {
  readonly id: string;
  readonly name: string;
  readonly dueDate: string | null;
};
export type MilestoneInput = {
  readonly name: string;
  readonly description: string;
  /** 빈 문자열 = 마감일 없음. */
  readonly dueDate: string;
};

/** 0~100 정수. 업무가 없으면 0. */
export function milestonePercent(progress: Milestone["progress"]) {
  return progress.total
    ? Math.floor((progress.done / progress.total) * 100)
    : 0;
}

/** 마감이 지났고 아직 남은 업무가 있으면 true. 날짜는 Asia/Seoul 기준. */
export function milestoneOverdue(milestone: Milestone, today: string) {
  return (
    !!milestone.dueDate &&
    milestone.dueDate < today &&
    milestone.progress.done < milestone.progress.total
  );
}

const errors: Readonly<Record<string, string>> = {
  MILESTONE_NOT_FOUND: "마일스톤을 찾을 수 없습니다. 목록을 다시 확인하세요.",
  DUPLICATE_MILESTONE_NAME:
    "같은 이름의 마일스톤이 있습니다. 다른 이름을 쓰세요.",
  MILESTONE_NOT_IN_PROJECT: "이 프로젝트의 마일스톤만 고를 수 있습니다.",
  INVALID_SCOPE: "프로젝트 업무만 마일스톤에 넣을 수 있습니다.",
  PROJECT_FORBIDDEN: "이 작업을 할 권한이 없습니다.",
  PROJECT_ARCHIVED: "아카이브된 프로젝트는 조회만 가능합니다.",
  PROJECT_NOT_FOUND: "프로젝트가 없거나 볼 수 없습니다.",
};
export function milestoneErrorMessage(error: {
  readonly code: string;
  readonly message: string;
}) {
  return errors[error.code] ?? error.message;
}
