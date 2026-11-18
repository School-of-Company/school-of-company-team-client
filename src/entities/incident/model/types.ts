import type { KnowledgeSummary } from "@/entities/knowledge/@x/incident";
import type { TaskScope, TaskStatus } from "@/entities/task/@x/incident";

// 계약: 서버 docs/spec/s7-incidents.md. 사고·사후 검토는 조직 단위라 활성 팀원 모두가 본다.

export type IncidentSeverity = "SEV1" | "SEV2" | "SEV3";
export type IncidentStatus = "OPEN" | "MITIGATED" | "RESOLVED";
export type TimelineKind =
  "CREATED" | "STATUS" | "SEVERITY" | "COMMANDER" | "NOTE";
export type PostmortemStatus = "DRAFT" | "PUBLISHED";

export const incidentSeverities: readonly IncidentSeverity[] = [
  "SEV1",
  "SEV2",
  "SEV3",
];
export const incidentStatuses: readonly IncidentStatus[] = [
  "OPEN",
  "MITIGATED",
  "RESOLVED",
];
/** 해석 D7-2: 생성 때 고르게 하는 설명. 기본값은 두지 않는다. */
export const severityDescriptions: Readonly<Record<IncidentSeverity, string>> =
  {
    SEV1: "핵심 사용자 기능 중단",
    SEV2: "일부 기능·일부 사용자 영향",
    SEV3: "경미하거나 우회 가능",
  };
export const incidentStatusLabels: Readonly<Record<IncidentStatus, string>> = {
  OPEN: "대응 중",
  MITIGATED: "완화됨",
  RESOLVED: "해결됨",
};
export const timelineKindLabels: Readonly<Record<TimelineKind, string>> = {
  CREATED: "등록",
  STATUS: "상태",
  SEVERITY: "심각도",
  COMMANDER: "커맨더",
  NOTE: "메모",
};
export const postmortemStatusLabels: Readonly<
  Record<PostmortemStatus, string>
> = {
  DRAFT: "초안",
  PUBLISHED: "게시됨",
};

export type IncidentPerson = {
  readonly id: string;
  readonly username: string;
  readonly name: string;
  readonly avatarUrl: string | null;
};

export type IncidentService = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly tier: "TIER1" | "TIER2" | "TIER3";
  readonly archived: boolean;
};

export type IncidentSummary = {
  readonly id: string;
  readonly title: string;
  readonly severity: IncidentSeverity;
  readonly status: IncidentStatus;
  readonly commander: IncidentPerson | null;
  readonly services: readonly IncidentService[];
  readonly startedAt: string;
  readonly mitigatedAt: string | null;
  readonly resolvedAt: string | null;
  readonly postmortemStatus: PostmortemStatus | null;
};

export type TimelineEntry = {
  readonly id: string;
  readonly kind: TimelineKind;
  readonly occurredAt: string;
  readonly body: string;
  readonly author: IncidentPerson | null;
  readonly canDelete: boolean;
};

export type IncidentDetail = IncidentSummary & {
  readonly summary: string | null;
  readonly createdBy: IncidentPerson | null;
  readonly timeline: readonly TimelineEntry[];
  /** 영향 서비스에 연결된 게시 Runbook(제목 순). */
  readonly runbooks: readonly KnowledgeSummary[];
  /** 이 사고에 직접 연결된 문서(폐기 포함, 최근 수정 순). */
  readonly documents: readonly KnowledgeSummary[];
  readonly discordThreadUrl: string | null;
  readonly canEdit: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** accessible=false 면 나머지가 모두 null 이다(읽을 수 없는 업무는 식별자도 오지 않는다). */
export type LinkedTask = {
  readonly id: string | null;
  readonly accessible: boolean;
  readonly key: string | null;
  readonly title: string | null;
  readonly status: TaskStatus | null;
  readonly scope: TaskScope | null;
};

export type ActionItem = {
  readonly id: string;
  readonly title: string;
  readonly task: LinkedTask | null;
  readonly createdAt: string;
};

export type PostmortemSections = {
  readonly summary: string;
  readonly impact: string;
  readonly rootCause: string;
  readonly timeline: string;
};

export type Postmortem = PostmortemSections & {
  readonly incidentId: string;
  readonly status: PostmortemStatus;
  readonly actionItems: readonly ActionItem[];
  readonly createdBy: IncidentPerson | null;
  readonly updatedBy: IncidentPerson | null;
  readonly canEdit: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly publishedAt: string | null;
};

export type CreateIncident = {
  readonly title: string;
  readonly summary?: string;
  readonly severity: IncidentSeverity;
  readonly commanderId?: string;
  readonly serviceIds: readonly string[];
  readonly startedAt?: string;
};
export type UpdateIncident = {
  readonly title?: string;
  readonly summary?: string;
  readonly severity?: IncidentSeverity;
  readonly commanderId?: string;
  readonly serviceIds?: readonly string[];
  readonly startedAt?: string;
};
export type ChangeIncidentStatus = {
  readonly status: IncidentStatus;
  readonly at?: string;
  readonly note?: string;
};
export type UpdatePostmortem = Partial<PostmortemSections> & {
  readonly status?: PostmortemStatus;
};
export type CreateActionItemTask = {
  readonly scope: "PROJECT" | "TEAM";
  readonly projectId?: string;
  readonly assigneeIds: readonly string[];
};

export type Discussion = {
  readonly threadId: string;
  readonly url: string;
  readonly created: boolean;
  readonly archived: boolean;
  readonly locked: boolean;
  readonly verified: boolean;
};

/** 시작부터 해결(없으면 지금)까지 분. 화면의 "영향 시간"과 사후 검토 초안이 같은 규칙을 쓴다. */
export function impactMinutes(
  incident: Pick<IncidentSummary, "startedAt" | "resolvedAt">,
  now: number = Date.now(),
): number {
  const start = new Date(incident.startedAt).getTime();
  const end = incident.resolvedAt
    ? new Date(incident.resolvedAt).getTime()
    : now;
  return Math.max(0, Math.floor((end - start) / 60_000));
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${days}일 ${restHours}시간` : `${days}일`;
}
