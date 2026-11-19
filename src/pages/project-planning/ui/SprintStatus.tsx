import { sprintStatusLabels, type SprintStatus } from "@/entities/sprint";

/** Sprint 상태 표시. 색 점이 아니라 글자 자체가 상태이고, 진행 중만 강조한다. */
export function SprintStatusBadge({
  status,
}: {
  readonly status: SprintStatus;
}) {
  return (
    <span className="sprint-status" data-status={status}>
      {sprintStatusLabels[status]}
    </span>
  );
}
