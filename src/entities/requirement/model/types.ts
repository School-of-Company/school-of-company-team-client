import type {
  TaskPriority,
  TaskStatus,
  TaskType,
} from "@/entities/task/@x/requirement";

// 서버 계약: school-of-company-team-server docs/spec/s12-intake.md (feat/intake).

export type RequirementStatus =
  | "SUBMITTED"
  | "IN_REVIEW"
  | "ACCEPTED"
  | "ON_HOLD"
  | "REJECTED"
  | "IN_PROGRESS"
  | "DONE"
  | "WITHDRAWN"
  | "SPAM";
export type RequesterPriority = "URGENT" | "HIGH" | "NORMAL" | "LOW";
export type MessageVisibility = "PUBLIC" | "INTERNAL";
export type LinkKind =
  | "NOTION"
  | "FIGMA"
  | "GOOGLE_DOCS"
  | "GOOGLE_SHEETS"
  | "GOOGLE_SLIDES"
  | "GOOGLE_DRIVE"
  | "GITHUB"
  | "YOUTUBE"
  | "MIRO"
  | "OTHER";

// 객체 순서가 선택지 순서다. SPAM 은 상태 페이지에 나오지 않는다(404).
export const requirementStatusLabels: Record<RequirementStatus, string> = {
  SUBMITTED: "접수됨",
  IN_REVIEW: "검토 중",
  ACCEPTED: "수락됨",
  ON_HOLD: "보류",
  REJECTED: "반려",
  IN_PROGRESS: "진행 중",
  DONE: "완료",
  WITHDRAWN: "철회함",
  SPAM: "스팸",
};
export const requirementStatuses = Object.keys(
  requirementStatusLabels,
) as RequirementStatus[];

export const requesterPriorityLabels: Record<RequesterPriority, string> = {
  URGENT: "긴급",
  HIGH: "높음",
  NORMAL: "보통",
  LOW: "낮음",
};

/** 사유가 필수인 상태(D12-3). 사유는 요청자에게 보인다. */
export const reasonRequired = (status: RequirementStatus) =>
  status === "ON_HOLD" || status === "REJECTED";

/** 팀이 고를 수 있는 다음 상태. WITHDRAWN 은 요청자만, WITHDRAWN·SPAM 에서는 나올 수 없다(D12-3). */
export const teamStatusTargets = (
  current: RequirementStatus,
): readonly RequirementStatus[] =>
  current === "WITHDRAWN" || current === "SPAM"
    ? []
    : requirementStatuses.filter((status) => status !== "WITHDRAWN");

/** 업무 만들기는 수락·진행 중에서만(18). */
export const canCreateTasksIn = (status: RequirementStatus) =>
  status === "ACCEPTED" || status === "IN_PROGRESS";

export const MAX_TASKS_PER_REQUEST = 30;

// ── 공개(요청자) ──

export type TemplateFieldType =
  "TEXT" | "LONG_TEXT" | "LIST" | "SELECT" | "DATE" | "URL_LIST";

export type TemplateField = {
  readonly key: string;
  readonly label: string;
  readonly type: TemplateFieldType;
  readonly required: boolean;
  readonly help: string | null;
  readonly maxLength: number | null;
  readonly maxItems: number | null;
};

export type PublicForm = {
  readonly title: string;
  readonly description: string | null;
  readonly templateVersion: number;
  readonly template: readonly TemplateField[];
  readonly priorities: readonly {
    readonly value: RequesterPriority;
    readonly label: string;
  }[];
  readonly consentText: string;
  readonly consentReviewRequired: boolean;
  readonly issuedAt: number;
  readonly issuedSig: string;
};

export type Requester = {
  readonly name: string;
  readonly organization: string;
  readonly email: string;
  readonly phone?: string;
};

export type SubmitRequirement = {
  readonly sections: Readonly<Record<string, string | readonly string[]>>;
  readonly priority: RequesterPriority | null;
  readonly desiredDate?: string;
  readonly references: readonly string[];
  readonly requester: Requester;
  readonly consent: boolean;
  readonly issuedAt: number;
  readonly issuedSig: string;
  readonly website: string;
};

export type Section = {
  readonly key: string;
  readonly label: string;
  readonly body: string;
};
export type Reference = { readonly url: string; readonly kind: LinkKind };
export type Progress = { readonly done: number; readonly total: number };

export type PublicMessage = {
  readonly author: "TEAM" | "REQUESTER";
  readonly body: string;
  readonly createdAt: string;
};

export type PublicRequirement = {
  readonly title: string;
  readonly status: RequirementStatus;
  readonly statusLabel: string;
  readonly statusReason: string | null;
  readonly formTitle: string | null;
  readonly submittedAt: string;
  readonly priority: RequesterPriority;
  readonly desiredDate: string | null;
  readonly sections: readonly Section[];
  readonly references: readonly Reference[];
  readonly messages: readonly PublicMessage[];
  readonly progress: Progress;
  readonly canReply: boolean;
  readonly canWithdraw: boolean;
};

// ── 내부 ──

type UserSummary = {
  readonly id: string;
  readonly name: string;
  readonly avatarUrl?: string | null;
};

export type RequirementSummary = {
  readonly id: string;
  /** null 이면 조직 단위. */
  readonly projectId: string | null;
  readonly projectKey: string | null;
  readonly formTitle: string | null;
  readonly title: string;
  readonly status: RequirementStatus;
  readonly requesterPriority: RequesterPriority;
  readonly submittedAt: string;
  readonly updatedAt: string;
  readonly taskCount: number;
};

export type RequirementMessage = {
  readonly id: string;
  readonly authorKind: "TEAM" | "REQUESTER";
  readonly author: UserSummary | null;
  readonly visibility: MessageVisibility;
  readonly body: string;
  readonly createdAt: string;
  readonly canDelete: boolean;
};

export type RequirementEventKind =
  | "SUBMITTED"
  | "STATUS"
  | "MOVED"
  | "TASK_LINKED"
  | "TASK_UNLINKED"
  | "TOKEN_REISSUED"
  | "REQUESTER_PURGED";

export const eventKindLabels: Record<RequirementEventKind, string> = {
  SUBMITTED: "접수",
  STATUS: "상태 변경",
  MOVED: "프로젝트 지정",
  TASK_LINKED: "업무 연결",
  TASK_UNLINKED: "업무 연결 해제",
  TOKEN_REISSUED: "상태 링크 재발급",
  REQUESTER_PURGED: "요청자 정보 삭제",
};

export type RequirementDetail = Omit<RequirementSummary, "taskCount"> & {
  readonly formId: string | null;
  readonly statusReason: string | null;
  readonly desiredDate: string | null;
  readonly templateVersion: number;
  readonly closedAt: string | null;
  readonly requesterPurgedAt: string | null;
  readonly sections: readonly Section[];
  readonly references: readonly Reference[];
  /** PM·헤드 어드민(조직 단위는 헤드 어드민)에게만, 지워졌으면 null. */
  readonly requester: (Requester & { readonly consentedAt: string }) | null;
  readonly messages: readonly RequirementMessage[];
  readonly tasks: readonly {
    readonly id: string;
    readonly key: string | null;
    readonly title: string;
    readonly status: TaskStatus;
    readonly featureIndex: number | null;
  }[];
  readonly progress: Progress;
  readonly events: readonly {
    readonly kind: RequirementEventKind;
    readonly fromStatus: RequirementStatus | null;
    readonly toStatus: RequirementStatus | null;
    readonly actor: UserSummary | null;
    readonly occurredAt: string;
  }[];
  readonly canManage: boolean;
};

export type RequirementTaskItem = {
  readonly title?: string;
  readonly featureIndex?: number;
  readonly type?: TaskType;
  readonly priority?: TaskPriority;
  readonly partId?: string;
  readonly status?: TaskStatus;
};

export type IntakeForm = {
  readonly id: string;
  readonly projectId: string | null;
  readonly publicTitle: string;
  readonly publicDescription: string | null;
  readonly active: boolean;
  readonly expiresAt: string | null;
  readonly dailyLimit: number;
  readonly templateVersion: number;
  readonly url: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly rotatedAt: string | null;
};

export type SaveIntakeForm = {
  readonly publicTitle?: string;
  readonly publicDescription?: string | null;
  readonly active?: boolean;
  readonly expiresAt?: string | null;
  readonly clearExpiresAt?: boolean;
  readonly dailyLimit?: number;
};

/** 기능 목록 섹션(`- 항목` 줄 목록)을 항목으로 되돌린다. 업무 만들기의 featureIndex 가 이 순서다(서버 IntakeTemplate.items). */
export const sectionItems = (body: string | undefined) =>
  (body ?? "")
    .split("\n")
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean);

/** 요청자가 보낸 URL 은 http(s) 일 때만 링크로 쓴다(서버도 검사하지만 렌더 시 한 번 더, javascript: 등 차단). */
export const safeHref = (url: string): string | undefined => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
};
