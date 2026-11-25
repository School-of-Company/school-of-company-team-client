import {
  incidentStatusLabels,
  severityDescriptions,
  severityLabels,
  type IncidentSeverity,
  type IncidentSource,
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

/** 헬스체크나 업타임 웹훅이 만든 사고에만 붙는다. */
export function MonitorSourceBadge({
  source,
}: {
  readonly source: IncidentSource;
}) {
  return source === "MANUAL" ? null : (
    <span
      className="ui-badge"
      title={
        source === "MONITOR_HEALTH"
          ? "헬스체크가 다운을 감지해 만들었습니다"
          : "업타임 웹훅이 다운을 알려 만들었습니다"
      }
    >
      모니터링이 만듦
    </span>
  );
}
