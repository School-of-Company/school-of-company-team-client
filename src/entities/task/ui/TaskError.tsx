"use client";

/* Hallmark · dropped onRetry={onRetry} · Requested 404 retries are removed; transient failure retries remain available. */

import Link from "next/link";
import { normalizeApiError } from "@/shared/api";
import { ErrorState } from "@/shared/ui";

export function TaskError({
  error,
  onRetry,
  imported = false,
  retryMissing = false,
}: {
  readonly error: unknown;
  readonly onRetry: () => void;
  readonly imported?: boolean;
  /** 404에도 다시 시도를 둔다. 권한이 돌아올 수 있는 상세(비공개 전환·참여 해제 뒤 회복)에서만 쓴다. */
  readonly retryMissing?: boolean;
}) {
  const problem = normalizeApiError(error);
  const titles: Readonly<Record<string, string>> = {
    PROJECT_NOT_FOUND: "프로젝트를 찾을 수 없거나 접근할 수 없어요",
    TASK_NOT_FOUND: "업무를 찾을 수 없거나 접근할 수 없어요",
    PROJECT_FORBIDDEN: "이 프로젝트를 수정할 권한이 없어요",
    PROJECT_ARCHIVED: "아카이브된 프로젝트는 조회만 가능해요",
    SUSPENDED: "이용이 중지된 계정이에요",
    ACCESS_DENIED: "접근 권한이 없어요",
    ONBOARDING_REQUIRED: "승인 및 Discord 연결이 필요해요",
  };
  return (
    <div>
      <ErrorState
        title={titles[problem.code]}
        description={
          problem.code === "TASK_NOT_FOUND" && imported
            ? "GitHub에서 가져온 업무라면 원본 접근 권한을 확인하거나 다시 로그인해 주세요."
            : problem.message
        }
        onRetry={problem.status === 404 && !retryMissing ? undefined : onRetry}
      />
      {problem.code === "ONBOARDING_REQUIRED" && (
        <Link href="/pending" className="text-brand underline">
          계정 상태 확인
        </Link>
      )}
    </div>
  );
}
