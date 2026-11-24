export type ProjectStage =
  | "REVIEW"
  | "PREPARATION"
  | "DEVELOPMENT"
  | "VERIFICATION"
  | "OPERATION"
  | "CLOSED"
  | "ON_HOLD";
export type ProjectKind = "OUTSOURCING" | "INTERNAL" | "RND";
export type ProjectWorkflow = "SPRINT" | "KANBAN";

// 팀 운영 문서 v3 제3장(단계)·제5장(진행 방식). 객체 순서가 선택지 순서다.
export const stageLabels: Record<ProjectStage, string> = {
  REVIEW: "검토",
  PREPARATION: "준비",
  DEVELOPMENT: "개발",
  VERIFICATION: "검증",
  OPERATION: "운영",
  CLOSED: "종료",
  ON_HOLD: "보류",
};
export const kindLabels: Record<ProjectKind, string> = {
  OUTSOURCING: "외주",
  INTERNAL: "내부",
  RND: "R&D",
};
export const workflowLabels: Record<ProjectWorkflow, string> = {
  SPRINT: "Sprint",
  KANBAN: "Kanban",
};

export type Project = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly imageUrl?: string | null;
  readonly archived: boolean;
  readonly visibility: "TEAM" | "MEMBERS";
  readonly pmUserId: string | null;
  readonly stage: ProjectStage;
  readonly kind: ProjectKind;
  readonly workflow: ProjectWorkflow;
  readonly createdAt: string;
};
export type ProjectDetail = Project & {
  readonly members: readonly {
    readonly userId: string;
    readonly name: string;
    readonly pm: boolean;
  }[];
  readonly parts: readonly {
    readonly id: string;
    readonly name: string;
    readonly memberUserIds: readonly string[];
  }[];
};

export type PlanningBucket = {
  readonly id: string;
  readonly name: string;
  readonly position: number;
  readonly archived: boolean;
  readonly createdAt: string;
};

export function projectAccess(
  project: ProjectDetail,
  user: { readonly id: string; readonly role: string },
) {
  const manages = user.role === "LEAD" || project.pmUserId === user.id;
  const participates = project.members.some(
    (member) => member.userId === user.id,
  );
  return {
    manages,
    participates,
    editable: !project.archived && (manages || participates),
  };
}
