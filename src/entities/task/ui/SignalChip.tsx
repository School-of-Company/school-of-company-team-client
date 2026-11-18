import type { ReactNode } from "react";
import { Icon, type IconName } from "@/shared/ui";
import {
  ciLabels,
  reviewLabels,
  type CiStatus,
  type ReviewSignal,
} from "../model/dev-signal";

export type SignalTone = "danger" | "success" | "warning" | "merged" | "muted";

// 색은 아이콘에만 쓰고 글자는 보조 글자색으로 둔다(색만으로 뜻을 전하지 않고 대비 4.5:1 유지).
export function SignalChip({
  tone,
  icon,
  children,
  title,
}: {
  readonly tone: SignalTone;
  readonly icon: IconName;
  readonly children: ReactNode;
  readonly title?: string;
}) {
  return (
    <span className="signal-chip" data-tone={tone} title={title}>
      <Icon name={icon} />
      {children}
    </span>
  );
}

const ci: Readonly<Record<CiStatus, [SignalTone, IconName]>> = {
  SUCCESS: ["success", "check"],
  FAILURE: ["danger", "close"],
  NEUTRAL: ["muted", "minus"],
  NONE: ["muted", "clock"],
};
const review: Readonly<Record<ReviewSignal, [SignalTone, IconName]>> = {
  CHANGES_REQUESTED: ["warning", "alert"],
  REQUESTED: ["muted", "clock"],
  APPROVED: ["success", "check"],
  NONE: ["muted", "minus"],
};

export function CiChip({ status }: { readonly status: CiStatus }) {
  const [tone, icon] = ci[status];
  return (
    <SignalChip tone={tone} icon={icon}>
      {ciLabels[status]}
    </SignalChip>
  );
}

export function ReviewChip({
  signal,
  children,
}: {
  readonly signal: ReviewSignal;
  readonly children?: ReactNode;
}) {
  const [tone, icon] = review[signal];
  return (
    <SignalChip tone={tone} icon={icon}>
      {children ?? reviewLabels[signal]}
    </SignalChip>
  );
}

export function MergedChip() {
  return (
    <SignalChip tone="merged" icon="merge">
      merge됨
    </SignalChip>
  );
}
