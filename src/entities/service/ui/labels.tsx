import { avatarSrc } from "@/entities/user/@x/service";
import { Avatar } from "@/shared/ui";
import {
  tierDescriptions,
  tierLabels,
  type ServiceOwner,
  type ServiceTier,
} from "../model/types";

export function TierLabel({ tier }: { readonly tier: ServiceTier }) {
  return (
    <span
      className="service-tier"
      data-tier={tier}
      title={tierDescriptions[tier]}
    >
      {tierLabels[tier]}
    </span>
  );
}

/** 주 소유자 먼저. 이용 중지 등 비활성 소유자는 이름 옆에 표시해 교체를 유도한다. */
export function OwnerList({
  owners,
  compact = false,
}: {
  readonly owners: readonly ServiceOwner[];
  readonly compact?: boolean;
}) {
  const shown = compact ? owners.slice(0, 1) : owners;
  const rest = owners.length - shown.length;
  return (
    <span className="service-owners">
      {shown.map((owner) => (
        <span key={owner.userId} className="service-owner">
          <Avatar name={owner.name} src={avatarSrc(owner.avatarUrl)} />
          <span className="truncate">{owner.name}</span>
          {!compact && owner.role === "PRIMARY" && (
            <span className="text-xs text-muted">주</span>
          )}
          {!owner.active && <span className="text-xs text-danger">비활성</span>}
        </span>
      ))}
      {rest > 0 && (
        <span className="text-xs text-muted tabular-nums">외 {rest}명</span>
      )}
    </span>
  );
}
