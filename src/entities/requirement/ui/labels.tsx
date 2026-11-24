import { Badge } from "@/shared/ui";
import {
  requesterPriorityLabels,
  requirementStatusLabels,
  type RequesterPriority,
  type RequirementStatus,
} from "../model/types";

const tone: Partial<Record<RequirementStatus, string>> = {
  SUBMITTED: "badge-blue",
  IN_REVIEW: "badge-blue",
  ACCEPTED: "badge-green",
  IN_PROGRESS: "badge-green",
  DONE: "badge-green",
  REJECTED: "badge-red",
  SPAM: "badge-red",
};

export function RequirementStatusBadge({
  status,
  label,
}: {
  readonly status: RequirementStatus;
  /** 공개 응답의 statusLabel(서버 문구)이 있으면 그것을 쓴다. */
  readonly label?: string;
}) {
  return (
    <Badge className={tone[status] ?? ""}>
      {label ?? requirementStatusLabels[status]}
    </Badge>
  );
}

export function RequesterPriorityLabel({
  priority,
}: {
  readonly priority: RequesterPriority;
}) {
  return <span>희망 {requesterPriorityLabels[priority]}</span>;
}
