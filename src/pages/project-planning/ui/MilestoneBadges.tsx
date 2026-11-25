import { useId } from "react";
import {
  milestoneRiskLabels,
  milestoneStatusLabels,
  type Milestone,
} from "@/entities/milestone";

/** 계획(회색), 진행(파랑), 완료(초록), 지연(빨강). 글자로도 상태를 쓴다. */
export function MilestoneStatusBadge({
  milestone,
}: {
  readonly milestone: Milestone;
}) {
  return (
    <span className="milestone-status" data-status={milestone.status}>
      {milestoneStatusLabels[milestone.status]}
      {milestone.statusSource === "MANUAL" && (
        <span className="sr-only"> (수동 지정)</span>
      )}
    </span>
  );
}

/** 주의, 위험만 그린다. 이유는 마우스를 올리거나 포커스하면 보이고, 화면 낭독기는 설명으로 읽는다. */
export function MilestoneRiskBadge({
  milestone,
}: {
  readonly milestone: Milestone;
}) {
  const tip = useId();
  const { level, reason } = milestone.risk;
  if (level === "NONE") return null;
  return (
    <span className="milestone-risk-wrap">
      <button
        type="button"
        className="milestone-risk"
        data-level={level}
        aria-describedby={reason ? tip : undefined}
      >
        {milestoneRiskLabels[level]}
      </button>
      {reason && (
        <span id={tip} role="tooltip" className="milestone-risk-tip">
          {reason}
        </span>
      )}
    </span>
  );
}
