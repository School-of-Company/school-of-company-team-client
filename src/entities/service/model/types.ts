export type ServiceTier = "TIER1" | "TIER2" | "TIER3";
export type OwnerRole = "PRIMARY" | "SECONDARY";
export type DependencyKind = "API" | "EVENT" | "DATA" | "OTHER";
export type ReleaseItemsStatus =
  "PENDING" | "READY" | "TRUNCATED" | "NO_BASE" | "FAILED";
export type DeploymentStatus =
  "QUEUED" | "IN_PROGRESS" | "SUCCESS" | "FAILURE" | "CANCELLED";

export const serviceTiers: readonly ServiceTier[] = ["TIER1", "TIER2", "TIER3"];
export const tierLabels: Readonly<Record<ServiceTier, string>> = {
  TIER1: "1등급",
  TIER2: "2등급",
  TIER3: "3등급",
};
export const tierDescriptions: Readonly<Record<ServiceTier, string>> = {
  TIER1: "핵심 사용자 영향",
  TIER2: "내부 영향",
  TIER3: "실험·도구",
};
export const dependencyKinds: readonly DependencyKind[] = [
  "API",
  "EVENT",
  "DATA",
  "OTHER",
];
export const kindLabels: Readonly<Record<DependencyKind, string>> = {
  API: "API",
  EVENT: "이벤트",
  DATA: "데이터",
  OTHER: "기타",
};
export const deploymentStatusLabels: Readonly<
  Record<DeploymentStatus, string>
> = {
  QUEUED: "대기",
  IN_PROGRESS: "진행 중",
  SUCCESS: "성공",
  FAILURE: "실패",
  CANCELLED: "취소",
};

export type ServiceOwner = {
  readonly userId: string;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly role: OwnerRole;
  readonly active: boolean;
};

export type ServiceSummary = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly tier: ServiceTier;
  readonly archived: boolean;
  readonly owners: readonly ServiceOwner[];
  readonly repositoryCount: number;
  readonly canEdit: boolean;
};

/** 비공개이고 조회자에게 원본 권한이 없으면 accessible=false 이고 이름·URL·워크플로가 비어 있다. */
export type ServiceRepository = {
  readonly repositoryId: number;
  readonly accessible: boolean;
  readonly private: boolean;
  readonly fullName: string | null;
  readonly url: string | null;
  readonly deployWorkflowName: string | null;
  readonly deployEnvironment: string;
};

export type ServiceDependency = {
  readonly serviceId: string;
  readonly key: string;
  readonly name: string;
  readonly tier: ServiceTier;
  readonly archived: boolean;
  readonly kind: DependencyKind;
  readonly note: string | null;
};

export type ServiceDetail = Omit<ServiceSummary, "repositoryCount"> & {
  readonly description: string | null;
  readonly repositories: readonly ServiceRepository[];
  /** 이 서비스가 의존하는 서비스. */
  readonly upstream: readonly ServiceDependency[];
  /** 이 서비스에 의존하는 서비스. */
  readonly downstream: readonly ServiceDependency[];
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type GraphNode = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly tier: ServiceTier;
  readonly archived: boolean;
};
export type GraphEdge = {
  readonly from: string;
  readonly to: string;
  readonly kind: DependencyKind;
};
export type DependencyGraph = {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
};

export type ReleaseSummary = {
  readonly id: string;
  readonly repositoryId: number;
  readonly repositoryFullName: string;
  readonly tag: string;
  readonly name: string | null;
  readonly prerelease: boolean;
  readonly url: string;
  readonly publishedAt: string;
  readonly itemsStatus: ReleaseItemsStatus;
  readonly itemCount: number;
};

export type ReleaseTask = {
  readonly id: string;
  /** 개인 업무는 key가 없다(본인에게만 보인다). */
  readonly key: string | null;
  readonly title: string;
  readonly status: "BACKLOG" | "PLANNED" | "IN_PROGRESS" | "REVIEW" | "DONE";
  readonly projectId: string | null;
};

export type ReleaseItem = {
  readonly number: number;
  readonly title: string;
  readonly url: string;
  readonly mergedAt: string | null;
  readonly tasks: readonly ReleaseTask[];
};

export type ReleaseDetail = ReleaseSummary & {
  readonly baseTag: string | null;
  readonly services: readonly {
    readonly id: string;
    readonly key: string;
    readonly name: string;
  }[];
  readonly items: readonly ReleaseItem[];
};

export type Deployment = {
  readonly id: string;
  readonly repositoryId: number;
  readonly repositoryFullName: string;
  readonly environment: string;
  readonly sha: string;
  readonly ref: string | null;
  readonly status: DeploymentStatus;
  readonly source: "DEPLOYMENT_STATUS" | "WORKFLOW_RUN";
  readonly url: string | null;
  readonly startedAt: string;
  readonly finishedAt: string | null;
};

export type CreateService = {
  readonly key: string;
  readonly name: string;
  readonly description?: string;
  readonly tier: ServiceTier;
  readonly primaryOwnerId: string;
  readonly secondaryOwnerIds: readonly string[];
};
export type UpdateService = {
  readonly name?: string;
  readonly description?: string;
  readonly tier?: ServiceTier;
};
export type OwnerEntry = { readonly userId: string; readonly role: OwnerRole };

/** PRIMARY 먼저, 그 다음 서버가 준 이름 순서. */
export const primaryOwner = (owners: readonly ServiceOwner[]) =>
  owners.find((owner) => owner.role === "PRIMARY");
