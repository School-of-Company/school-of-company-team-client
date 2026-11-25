// 계약: 서버 docs/spec/s15-milestone-v2.md(s4 Milestone 확장). 진행률, 상태, 위험은 조회자가 볼 수 있는 업무만 센다.

export type MilestoneStatus = "PLANNED" | "IN_PROGRESS" | "DONE" | "DELAYED";
export type MilestoneRiskLevel = "NONE" | "WATCH" | "AT_RISK";

export const milestoneStatuses: readonly MilestoneStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "DONE",
  "DELAYED",
];
export const milestoneStatusLabels: Readonly<Record<MilestoneStatus, string>> =
  {
    PLANNED: "계획",
    IN_PROGRESS: "진행",
    DONE: "완료",
    DELAYED: "지연",
  };
export const milestoneRiskLabels: Readonly<Record<MilestoneRiskLevel, string>> =
  {
    NONE: "",
    WATCH: "주의",
    AT_RISK: "위험",
  };

export type MilestoneSprint = {
  readonly id: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: "PLANNED" | "ACTIVE" | "CLOSED";
};

export type MilestoneReleaseItem = {
  readonly number: number;
  readonly title: string;
  readonly url: string;
  readonly mergedAt: string | null;
};

export type MilestoneRelease = {
  readonly id: string;
  readonly tag: string;
  readonly name: string | null;
  readonly url: string;
  readonly publishedAt: string;
  readonly itemsStatus:
    "PENDING" | "READY" | "TRUNCATED" | "NO_BASE" | "FAILED";
  /** 상세 조회에서만 채운다. 목록, 로드맵, 쓰기 응답은 null. */
  readonly items: readonly MilestoneReleaseItem[] | null;
};

export type Milestone = {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly description: string | null;
  readonly goal: string | null;
  readonly specDocument: {
    readonly id: string;
    readonly kind: string;
    readonly title: string;
  } | null;
  readonly startDate: string | null;
  readonly dueDate: string | null;
  /** startDate ?: 가장 이른 연결 스프린트 시작일 ?: null. */
  readonly timelineStart: string | null;
  readonly status: MilestoneStatus;
  readonly autoStatus: MilestoneStatus;
  readonly statusSource: "AUTO" | "MANUAL";
  readonly statusOverride: MilestoneStatus | null;
  readonly risk: {
    readonly level: MilestoneRiskLevel;
    readonly reason: string | null;
  };
  readonly progress: {
    readonly total: number;
    readonly done: number;
    readonly totalWeight: number | null;
    readonly doneWeight: number | null;
  };
  readonly sprints: readonly MilestoneSprint[];
  readonly releaseLink: {
    readonly repositoryId: number;
    readonly repositoryFullName: string;
    readonly tag: string;
  } | null;
  readonly release: MilestoneRelease | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};
export type MilestoneSummary = {
  readonly id: string;
  readonly name: string;
  readonly dueDate: string | null;
};

/** 양식 값. 빈 문자열 = 없음(지우기). */
export type MilestoneInput = {
  readonly name: string;
  readonly description: string;
  readonly goal: string;
  readonly specDocumentId: string;
  readonly startDate: string;
  readonly dueDate: string;
  /** 빈 문자열 = 자동. */
  readonly statusOverride: MilestoneStatus | "";
  /** 저장소 id 빈 문자열 = 연결 없음. */
  readonly releaseRepositoryId: string;
  readonly releaseTag: string;
};

export const MILESTONE_GOAL_MAX = 2000;

/** 서버와 같은 기준으로 먼저 막는다. 키는 입력 이름. */
export function validateMilestone(input: MilestoneInput) {
  const errors: Record<string, string> = {};
  if (!input.name || input.name.length > 100)
    errors.name = "이름은 1~100자로 입력하세요.";
  if (input.description.length > 5000)
    errors.description = "설명은 5000자 이하로 입력하세요.";
  if (input.goal.length > MILESTONE_GOAL_MAX)
    errors.goal = `목표는 ${MILESTONE_GOAL_MAX}자 이하로 입력하세요.`;
  if (input.startDate && input.dueDate && input.dueDate < input.startDate)
    errors.dueDate = "마감일은 시작일과 같거나 뒤여야 합니다.";
  if (input.releaseRepositoryId) {
    const tag = input.releaseTag.trim();
    if (!tag || tag.length > 255 || /\s/.test(tag))
      errors.releaseTag = "태그는 공백 없이 1~255자로 입력하세요.";
  }
  return errors;
}

function releaseLink(input: MilestoneInput) {
  return input.releaseRepositoryId
    ? {
        repositoryId: Number(input.releaseRepositoryId),
        tag: input.releaseTag.trim(),
      }
    : null;
}

/** 생성 요청에는 상태 수동 지정이 없다(계약 4.2). 새 마일스톤은 자동 상태로 시작한다. */
export function createMilestoneBody(input: MilestoneInput) {
  return {
    name: input.name,
    description: input.description.trim() || null,
    goal: input.goal.trim() || null,
    specDocumentId: input.specDocumentId || null,
    startDate: input.startDate || null,
    dueDate: input.dueDate || null,
    releaseLink: releaseLink(input),
  };
}

/** 응답을 양식 값으로. 조회자가 못 읽는 문서, 저장소는 빈 값이 된다(그래서 수정은 바뀐 필드만 보낸다). */
export function milestoneInput(milestone: Milestone): MilestoneInput {
  return {
    name: milestone.name,
    description: milestone.description ?? "",
    goal: milestone.goal ?? "",
    specDocumentId: milestone.specDocument?.id ?? "",
    startDate: milestone.startDate ?? "",
    dueDate: milestone.dueDate ?? "",
    statusOverride: milestone.statusOverride ?? "",
    releaseRepositoryId: milestone.releaseLink
      ? String(milestone.releaseLink.repositoryId)
      : "",
    releaseTag: milestone.releaseLink?.tag ?? "",
  };
}

/**
 * 계약 4.2: 생략은 유지, 지우기는 `""` 또는 `clear*: true`. `previous`와 같은 필드는 보내지 않는다.
 * 조회자에게 숨겨진 기획 문서나 비공개 저장소 연결을 모르는 채로 지우지 않기 위해서다.
 */
export function updateMilestoneBody(
  input: MilestoneInput,
  previous: MilestoneInput,
) {
  const changed = (key: keyof MilestoneInput) => input[key] !== previous[key];
  const link = releaseLink(input);
  return {
    ...(changed("name") && { name: input.name }),
    ...(changed("description") && { description: input.description.trim() }),
    ...(changed("goal") && { goal: input.goal.trim() }),
    ...(changed("specDocumentId") && { specDocumentId: input.specDocumentId }),
    ...(changed("startDate") &&
      (input.startDate
        ? { startDate: input.startDate }
        : { clearStartDate: true })),
    ...(changed("dueDate") &&
      (input.dueDate ? { dueDate: input.dueDate } : { clearDueDate: true })),
    ...((changed("releaseRepositoryId") || changed("releaseTag")) &&
      (link ? { releaseLink: link } : { clearReleaseLink: true })),
    ...(changed("statusOverride") &&
      (input.statusOverride
        ? { statusOverride: input.statusOverride }
        : { clearStatusOverride: true })),
  };
}

/** 0~100 정수. 무게가 있으면 무게로, 없으면 개수로. 업무가 없으면 0. */
export function milestonePercent(progress: Milestone["progress"]) {
  if (progress.totalWeight && progress.doneWeight !== null)
    return Math.floor((progress.doneWeight / progress.totalWeight) * 100);
  return progress.total
    ? Math.floor((progress.done / progress.total) * 100)
    : 0;
}

const errors: Readonly<Record<string, string>> = {
  MILESTONE_NOT_FOUND: "마일스톤을 찾을 수 없습니다. 목록을 다시 확인하세요.",
  DUPLICATE_MILESTONE_NAME:
    "같은 이름의 마일스톤이 있습니다. 다른 이름을 쓰세요.",
  MILESTONE_NOT_IN_PROJECT: "이 프로젝트의 마일스톤만 고를 수 있습니다.",
  MILESTONE_RELEASE_REPOSITORY_NOT_LINKED:
    "서비스에 연결된 저장소만 고를 수 있습니다.",
  MILESTONE_SPEC_DOCUMENT_INVALID:
    "이 프로젝트 문서나 볼 수 있는 조직 문서만 고를 수 있습니다.",
  SPRINT_NOT_FOUND: "이 프로젝트의 스프린트가 아닙니다.",
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
