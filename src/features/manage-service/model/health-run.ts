import { normalizeApiError } from "@/shared/api";

/** 지금 검사는 서비스당 10초에 한 번(s17 3.6). 429 면 details.retryAfter 초, 성공하면 10초를 기다린다. */
export const HEALTH_RUN_COOLDOWN_SECONDS = 10;

export function retryAfterSeconds(error: unknown): number | null {
  const problem = normalizeApiError(error);
  if (problem.status !== 429) return null;
  const details = problem.details;
  const value =
    typeof details === "object" && details !== null && "retryAfter" in details
      ? Number(details.retryAfter)
      : NaN;
  return Number.isFinite(value) && value > 0
    ? Math.ceil(value)
    : HEALTH_RUN_COOLDOWN_SECONDS;
}
