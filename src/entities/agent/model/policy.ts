// 계약: 서버 docs/spec/s22-mcp-v3.md 2·3절(AgentDtos.kt).

export const agentAreas = [
  "TASKS",
  "COMMENTS",
  "SPRINTS",
  "MILESTONES",
  "DOCUMENTS",
  "WHITEBOARDS",
  "OPS_INCIDENTS",
  "INTAKE",
  "STATS",
] as const;
export type AgentArea = (typeof agentAreas)[number];

export const agentAccessLevels = ["OFF", "READ", "WRITE"] as const;
export type AgentAccess = (typeof agentAccessLevels)[number];

export const areaLabels: Record<AgentArea, string> = {
  TASKS: "업무",
  COMMENTS: "댓글",
  SPRINTS: "스프린트",
  MILESTONES: "마일스톤",
  DOCUMENTS: "문서",
  WHITEBOARDS: "화이트보드",
  OPS_INCIDENTS: "장애와 운영",
  INTAKE: "요구사항",
  STATS: "통계",
};

export const accessLabels: Record<AgentAccess, string> = {
  OFF: "끔",
  READ: "읽기",
  WRITE: "쓰기",
};

export const MAX_TOKEN_DAYS = 90;

export interface AgentPerson {
  readonly id: string;
  readonly username: string;
  readonly name: string;
  readonly avatarUrl?: string | null;
}

export interface AgentPolicyProject {
  readonly id: string;
  readonly key: string;
  readonly name: string;
}

export interface AgentPolicy {
  readonly mcpEnabled: boolean;
  readonly allowWriteTokens: boolean;
  readonly maxTokenDays: number;
  /** null = 모든 프로젝트. */
  readonly allowedProjects: readonly AgentPolicyProject[] | null;
  readonly areas: Readonly<Record<AgentArea, AgentAccess>>;
  readonly maxAccess: Readonly<Record<AgentArea, AgentAccess>>;
  readonly updatedAt: string | null;
  readonly updatedBy: AgentPerson | null;
}

export interface UpdateAgentPolicy {
  readonly mcpEnabled: boolean;
  readonly allowWriteTokens: boolean;
  readonly maxTokenDays: number;
  /** null = 모든 프로젝트. */
  readonly allowedProjectIds: readonly string[] | null;
  readonly areas: Readonly<Partial<Record<AgentArea, AgentAccess>>>;
}

/** 편집 중인 정책. 일 수는 입력 그대로(문자열) 두고 저장할 때 검사한다. */
export interface PolicyDraft {
  readonly mcpEnabled: boolean;
  readonly allowWriteTokens: boolean;
  readonly maxTokenDays: string;
  readonly allProjects: boolean;
  readonly projectIds: readonly string[];
  readonly areas: Readonly<Record<AgentArea, AgentAccess>>;
}

export const policyDraft = (policy: AgentPolicy): PolicyDraft => ({
  mcpEnabled: policy.mcpEnabled,
  allowWriteTokens: policy.allowWriteTokens,
  maxTokenDays: String(policy.maxTokenDays),
  allProjects: policy.allowedProjects === null,
  projectIds: policy.allowedProjects?.map((project) => project.id) ?? [],
  areas: policy.areas,
});

const rank: Record<AgentAccess, number> = { OFF: 0, READ: 1, WRITE: 2 };

/** 영역 최댓값을 넘는지. 최댓값을 모르면(서버가 영역을 빼면) 쓰기까지 허용한다. */
export const exceedsMax = (access: AgentAccess, max: AgentAccess | undefined) =>
  rank[access] > rank[max ?? "WRITE"];

export type PolicyErrors = {
  readonly maxTokenDays?: string;
  readonly areas?: Partial<Record<AgentArea, string>>;
  readonly projects?: string;
};

export function validatePolicy(
  draft: PolicyDraft,
  maxAccess: AgentPolicy["maxAccess"],
): PolicyErrors {
  const days = Number(draft.maxTokenDays);
  const areaErrors = Object.fromEntries(
    agentAreas
      .filter((area) => exceedsMax(draft.areas[area], maxAccess[area]))
      .map((area) => [
        area,
        `${areaLabels[area]} 영역은 ${accessLabels[maxAccess[area]]}까지만 열 수 있어요.`,
      ]),
  );
  return {
    ...(!/^\d+$/.test(draft.maxTokenDays.trim()) ||
    days < 1 ||
    days > MAX_TOKEN_DAYS
      ? { maxTokenDays: `1에서 ${MAX_TOKEN_DAYS} 사이 숫자를 적어 주세요.` }
      : {}),
    ...(Object.keys(areaErrors).length ? { areas: areaErrors } : {}),
    ...(!draft.allProjects && draft.projectIds.length > 100
      ? { projects: "프로젝트는 100개까지 고를 수 있어요." }
      : {}),
  };
}

export const hasPolicyErrors = (errors: PolicyErrors) =>
  Object.keys(errors).length > 0;

/** 정책 저장 요청. 영역은 바뀐 것만 보낸다(서버는 넣은 영역만 바꾼다). */
export function policyRequest(
  draft: PolicyDraft,
  current: AgentPolicy,
): UpdateAgentPolicy {
  return {
    mcpEnabled: draft.mcpEnabled,
    allowWriteTokens: draft.allowWriteTokens,
    maxTokenDays: Number(draft.maxTokenDays.trim()),
    allowedProjectIds: draft.allProjects
      ? null
      : [...new Set(draft.projectIds)],
    areas: Object.fromEntries(
      agentAreas
        .filter((area) => draft.areas[area] !== current.areas[area])
        .map((area) => [area, draft.areas[area]]),
    ),
  };
}

export interface AgentActivity {
  readonly id: string;
  readonly at: string;
  readonly user: AgentPerson | null;
  readonly tokenId: string;
  readonly tokenPrefix: string;
  readonly tool: string;
  readonly targetType: string | null;
  readonly targetRef: string | null;
  readonly resultCode: string;
  readonly argsSummary: string;
}

export interface ActivityFilters {
  readonly userId?: string;
  readonly tool?: string;
  readonly from?: string;
  readonly to?: string;
}

/** 감사 기록 조회 쿼리. 빈 값은 보내지 않는다. */
export function activityParams(filters: ActivityFilters, limit = 100) {
  const params = new URLSearchParams();
  for (const key of ["userId", "tool", "from", "to"] as const) {
    const value = filters[key]?.trim();
    if (value) params.set(key, value);
  }
  params.set("limit", String(limit));
  return params;
}

// 감사 기록에 남는 MCP 쓰기 도구(s22 4절). 필터 입력의 제안 목록으로만 쓴다.
export const agentWriteTools = [
  "update_task_status",
  "set_task_blocked",
  "create_task",
  "set_task_fields",
  "update_task",
  "start_work",
  "finish_work",
  "link_pr_to_task",
  "add_task_comment",
  "add_task_to_sprint",
  "remove_task_from_sprint",
  "create_sprint",
  "update_sprint",
  "start_sprint",
  "close_sprint",
  "create_milestone",
  "update_milestone",
  "create_document_draft",
  "update_document_draft",
  "add_incident_timeline_note",
  "create_incident",
  "update_incident_status",
  "set_incident_commander",
  "triage_intake",
] as const;

export type TokenScope = "READ" | "WRITE";

export interface AdminApiToken {
  readonly id: string;
  readonly owner: AgentPerson | null;
  readonly name: string;
  readonly scope: TokenScope;
  readonly prefix: string;
  readonly projectKeys: readonly string[] | null;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly lastUsedAt: string | null;
  readonly expired: boolean;
}

/** null = 모든 프로젝트, [] = 한정 프로젝트가 모두 지워져 아무것도 못 본다. */
export const projectKeysLabel = (keys: readonly string[] | null) =>
  keys === null
    ? "모든 프로젝트"
    : keys.length === 0
      ? "프로젝트 없음"
      : keys.join(", ");
