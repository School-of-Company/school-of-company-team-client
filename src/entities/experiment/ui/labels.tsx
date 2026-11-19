import {
  outcomeLabels,
  statusLabels,
  type ExperimentOutcome,
  type ExperimentStatus,
} from "../model/types";

/** 상태는 모양(점·채움)과 이름으로 읽힌다. 색만으로 구분하지 않는다. */
export function ExperimentStatusLabel({
  status,
}: {
  readonly status: ExperimentStatus;
}) {
  return (
    <span className="experiment-status" data-status={status}>
      {statusLabels[status]}
    </span>
  );
}

export function OutcomeBadge({
  outcome,
}: {
  readonly outcome: ExperimentOutcome;
}) {
  return (
    <span className="ui-badge experiment-outcome" data-outcome={outcome}>
      {outcomeLabels[outcome]}
    </span>
  );
}
