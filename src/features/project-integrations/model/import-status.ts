export type RepositoryImportStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCEEDED"
  | "PARTIAL"
  | "FAILED"
  | "RESTRICTED";

export type RepositoryImport = {
  readonly id: string;
  readonly projectRepositoryId: string;
  readonly status: RepositoryImportStatus;
  readonly imported: number;
  readonly skipped: number;
  readonly failed: number;
  readonly total?: number | null;
  readonly errorCode?: string | null;
  readonly startedAt?: string | null;
  readonly finishedAt?: string | null;
  readonly createdAt: string;
};

export type ImportSummary = {
  readonly text: string;
  readonly tone: "muted" | "danger";
  readonly retryable: boolean;
};

const reasons: Readonly<Record<string, string>> = {
  GITHUB_UNAVAILABLE: "GitHub에 연결할 수 없었어요",
  GITHUB_REPOSITORY_NOT_INSTALLED: "GitHub App이 이 저장소에 접근할 수 없어요",
  GITHUB_INSTALLATION_UNAVAILABLE: "GitHub App 설치가 중지되었어요",
  GITHUB_NO_REPOSITORY_ACCESS: "원본 저장소 접근 권한이 없어요",
  GITHUB_RATE_LIMITED: "GitHub 요청 한도에 걸렸어요",
};

function reason(code: string | null | undefined, fallback: string) {
  return (code && reasons[code]) ?? fallback;
}

export const isImportActive = (run: RepositoryImport | null | undefined) =>
  run?.status === "PENDING" || run?.status === "RUNNING";

export function importSummary(run: RepositoryImport): ImportSummary {
  const done = run.imported + run.skipped + run.failed;
  switch (run.status) {
    case "PENDING":
      return { text: "Issue 가져오기 대기 중", tone: "muted", retryable: false };
    case "RUNNING":
      return {
        text: run.total
          ? `Issue 가져오는 중 ${done}/${run.total}`
          : `Issue 가져오는 중 ${done}개 처리`,
        tone: "muted",
        retryable: false,
      };
    case "SUCCEEDED":
      return {
        text: `가져옴 ${run.imported} · 이미 있음 ${run.skipped}`,
        tone: "muted",
        retryable: false,
      };
    case "PARTIAL":
      return {
        text: `가져옴 ${run.imported} · 이미 있음 ${run.skipped} · 실패 ${run.failed}`,
        tone: "danger",
        retryable: true,
      };
    case "FAILED":
      return {
        text: `가져오지 못했어요: ${reason(run.errorCode, "잠시 후 다시 시도하세요")}`,
        tone: "danger",
        retryable: true,
      };
    case "RESTRICTED":
      return {
        text: `가져올 수 없어요: ${reason(run.errorCode, "GitHub App이 저장소에 접근할 수 없어요")}`,
        tone: "danger",
        retryable: false,
      };
    default: {
      const unreachable: never = run.status;
      return unreachable;
    }
  }
}
