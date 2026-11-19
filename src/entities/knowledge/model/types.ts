import type {
  IncidentPerson,
  IncidentService,
  IncidentSeverity,
  IncidentStatus,
  LinkedTask,
} from "@/entities/incident/@x/knowledge";

// 계약: 서버 docs/spec/s7-incidents.md 3.7. 문서는 활성 팀원 모두에게 보이고, 연결 업무만 조회자 읽기 권한으로 걸러진다.

export type KnowledgeKind = "ADR" | "RFC" | "RUNBOOK";
export type KnowledgeStatus = "DRAFT" | "PUBLISHED" | "DEPRECATED";
export type KnowledgeRelation = "REFERENCES" | "SUPERSEDES";

export const knowledgeKinds: readonly KnowledgeKind[] = ["ADR", "RFC", "RUNBOOK"];
export const knowledgeStatuses: readonly KnowledgeStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "DEPRECATED",
];
export const kindLabels: Readonly<Record<KnowledgeKind, string>> = {
  ADR: "ADR",
  RFC: "RFC",
  RUNBOOK: "Runbook",
};
export const kindDescriptions: Readonly<Record<KnowledgeKind, string>> = {
  ADR: "내린 결정과 그 이유",
  RFC: "논의할 제안",
  RUNBOOK: "장애·운영 대응 절차",
};
export const knowledgeStatusLabels: Readonly<Record<KnowledgeStatus, string>> =
  {
    DRAFT: "초안",
    PUBLISHED: "게시",
    DEPRECATED: "폐기",
  };
export const relationLabels: Readonly<Record<KnowledgeRelation, string>> = {
  REFERENCES: "참고",
  SUPERSEDES: "대체",
};

export type KnowledgeSummary = {
  readonly id: string;
  readonly kind: KnowledgeKind;
  readonly title: string;
  readonly status: KnowledgeStatus;
  readonly author: IncidentPerson | null;
  readonly updatedAt: string;
};

export type ServiceLink = {
  readonly linkId: string;
  readonly service: IncidentService;
};
export type TaskLink = { readonly linkId: string; readonly task: LinkedTask };
export type IncidentLink = {
  readonly linkId: string;
  readonly incidentId: string;
  readonly title: string;
  readonly severity: IncidentSeverity;
  readonly status: IncidentStatus;
  readonly startedAt: string;
};
export type DocumentLink = {
  readonly linkId: string;
  readonly relation: KnowledgeRelation;
  readonly document: KnowledgeSummary;
};

export type KnowledgeLinks = {
  readonly services: readonly ServiceLink[];
  readonly tasks: readonly TaskLink[];
  readonly incidents: readonly IncidentLink[];
  /** 이 문서가 가리키는 문서. */
  readonly documents: readonly DocumentLink[];
  /** 이 문서를 가리키는 다른 문서(역방향). 지우려면 그 문서에서 지운다. */
  readonly referencedBy: readonly DocumentLink[];
};

export type KnowledgeDetail = KnowledgeSummary & {
  readonly body: string;
  readonly links: KnowledgeLinks;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
  readonly createdAt: string;
  readonly publishedAt: string | null;
};

export type KnowledgeFilter = {
  readonly kind?: KnowledgeKind;
  readonly status?: KnowledgeStatus;
  readonly serviceId?: string;
  readonly taskId?: string;
  readonly incidentId?: string;
};

export type CreateKnowledge = {
  readonly kind: KnowledgeKind;
  readonly title: string;
  readonly body?: string;
  readonly serviceIds?: readonly string[];
  readonly incidentId?: string;
};
export type UpdateKnowledge = {
  readonly title?: string;
  readonly body?: string;
  readonly status?: KnowledgeStatus;
};
export type AddKnowledgeLink = {
  readonly relation?: KnowledgeRelation;
  readonly serviceId?: string;
  readonly taskId?: string;
  readonly incidentId?: string;
  readonly documentId?: string;
};

/** 이 문서를 대체한 문서(역방향 SUPERSEDES). 상태를 자동으로 바꾸지 않으므로 화면이 "대체됨"을 알린다(해석 D7-10). */
export const supersededBy = (links: KnowledgeLinks) =>
  links.referencedBy.filter((link) => link.relation === "SUPERSEDES");
