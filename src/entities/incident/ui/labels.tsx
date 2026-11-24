import {
  incidentStatusLabels,
  severityDescriptions,
  severityLabels,
  type IncidentSeverity,
  type IncidentStatus,
} from "../model/types";

/** 심각도는 우선순위와 같은 색 계열(SEV1=P0 빨강, SEV2=P1 주황, SEV3=P2 파랑)에 이름을 함께 쓴다. */
export function SeverityLabel({
  severity,
}: {
  readonly severity: IncidentSeverity;
}) {
  return (
    <span
      className="incident-severity"
      data-severity={severity}
      title={severityDescriptions[severity]}
    >
      {severityLabels[severity]}
    </span>
  );
}

/** 상태는 모양(빈 원 → 반 → 꽉 참)과 이름으로 읽힌다. 색만으로 구분하지 않는다. */
export function IncidentStatusLabel({
  status,
}: {
  readonly status: IncidentStatus;
}) {
  return (
    <span className="incident-status" data-status={status}>
      {incidentStatusLabels[status]}
    </span>
  );
}
