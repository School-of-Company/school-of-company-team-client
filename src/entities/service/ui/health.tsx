import { healthStatusLabels, type HealthStatus } from "../model/ops";

/** 상태는 모양(꽉 참, 반, 빈 칸, 점선)과 이름으로 읽힌다. 색만으로 구분하지 않는다. */
export function HealthBadge({ status }: { readonly status: HealthStatus }) {
  return (
    <span className="ops-health" data-status={status}>
      {healthStatusLabels[status]}
    </span>
  );
}
