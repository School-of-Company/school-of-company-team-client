"use client";

import { useState, useSyncExternalStore } from "react";
import { Button, Input } from "@/shared/ui";
import { statusLink } from "../model/status-token";

const noSubscribe = () => () => {};

/**
 * 상태 링크를 한 번만 보여 준다(서버는 해시만 둔다, D12-8). 화면을 벗어나면 다시 볼 수 없으므로
 * 복사 버튼과 경고를 함께 둔다. 링크는 어디에도 저장하거나 기록하지 않는다.
 */
export function StatusLinkOnce({
  token,
  audience = "requester",
}: {
  readonly token: string;
  /** requester: 요청자 본인, team: 팀원이 재발급해 요청자에게 전달. */
  readonly audience?: "requester" | "team";
}) {
  const origin = useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => "",
  );
  const link = origin ? statusLink(origin, token) : "";
  const [copied, setCopied] = useState<"ok" | "failed" | null>(null);
  return (
    <div className="grid gap-3 rounded-xl bg-surface-box p-4">
      <p role="alert" className="text-sm font-semibold">
        {audience === "requester"
          ? "이 링크는 지금 한 번만 보여 드립니다. 복사해 안전한 곳에 보관하세요. 잃어버리면 담당자에게 재발급을 요청해야 합니다."
          : "새 상태 링크입니다. 이전 링크는 더 이상 열리지 않습니다. 이 링크는 지금 한 번만 보이니 요청자에게 바로 전달하세요."}
      </p>
      <label htmlFor="status-link" className="text-sm font-medium">
        상태 링크
      </label>
      <div className="flex flex-wrap gap-2">
        <Input
          id="status-link"
          readOnly
          value={link}
          className="min-w-0 flex-1 font-mono text-xs"
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button
          variant="secondary"
          disabled={!link}
          onClick={() =>
            void navigator.clipboard.writeText(link).then(
              () => setCopied("ok"),
              () => setCopied("failed"),
            )
          }
        >
          복사
        </Button>
      </div>
      <p role="status" className="text-sm text-muted">
        {copied === "ok"
          ? "복사했습니다."
          : copied === "failed"
            ? "복사하지 못했습니다. 입력란을 선택해 직접 복사하세요."
            : "링크를 아는 사람은 누구나 진행 상황을 보고 답글을 달 수 있습니다. 다른 사람과 공유하지 마세요."}
      </p>
      {audience === "requester" && link && (
        <p className="text-sm">
          <a href={link} className="underline" rel="noreferrer">
            상태 페이지 열기
          </a>
        </p>
      )}
    </div>
  );
}
