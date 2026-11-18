"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useAccessToken,
  useAccountRestriction,
  useMe,
  useSessionReady,
  userDestination,
} from "@/entities/user";
import {
  authErrorCode,
  authErrorMessage,
  IdentityPanel,
  LogoutButton,
  OAuthButton,
} from "@/features/auth";
import { formatDate } from "@/shared/lib";
import { Button } from "@/shared/ui";

function PendingContent() {
  const me = useMe();
  const token = useAccessToken();
  const ready = useSessionReady();
  const restriction = useAccountRestriction();
  const router = useRouter();
  const params = useSearchParams();
  const suppliedStatus = params?.get("status");
  const status =
    me.data?.status ?? restriction ?? authErrorCode(me.error) ?? suppliedStatus;
  const terminal = status === "REJECTED" || status === "SUSPENDED";
  useEffect(() => {
    if (me.data && me.data.status === "ACTIVE")
      router.replace(userDestination(me.data));
    else if (ready && !token && !terminal) router.replace("/login");
  }, [me.data, ready, token, terminal, router]);
  const title =
    status === "REJECTED"
      ? "가입 승인이 거절되었습니다"
      : status === "SUSPENDED"
        ? "이용이 중지되었습니다"
        : "가입 승인을 기다리고 있습니다";
  const [manualCheck, setManualCheck] = useState(false);
  const checking = !ready || (Boolean(token) && me.isPending);
  const checkNow = async () => {
    setManualCheck(true);
    // ponytail: keep the label for at least 600ms so a fast response doesn't flash.
    await Promise.all([
      me.refetch(),
      new Promise((resolve) => setTimeout(resolve, 600)),
    ]);
    setManualCheck(false);
  };
  return (
    <IdentityPanel title={checking ? "계정 상태 확인 중" : title}>
      <p className="min-h-12 text-sm leading-6 text-(--color-ink-2)">
        {checking
          ? "잠시만 기다려 주세요."
          : terminal
            ? "관리자에게 계정 상태를 문의해 주세요."
            : "관리자가 승인하면 바로 다음 단계로 넘어가요."}
      </p>
      {me.isError && !terminal && !checking ? (
        <p role="alert" className="text-sm text-danger">
          {authErrorMessage(me.error)}
        </p>
      ) : null}
      {token || checking ? (
        <>
          <Button
            variant="secondary"
            disabled={checking || manualCheck}
            onClick={() => {
              void checkNow();
            }}
          >
            {manualCheck ? "확인하는 중" : "지금 확인"}
          </Button>
          <p aria-live="polite" className="text-xs text-muted">
            {checking || !me.dataUpdatedAt
              ? "\u00a0"
              : `자동으로 확인하고 있어요. 마지막 확인 ${formatDate(
                  new Date(me.dataUpdatedAt),
                  {
                    year: undefined,
                    month: undefined,
                    day: undefined,
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  },
                )}`}
          </p>
          <div className="pt-2">
            <LogoutButton appearance="link" />
          </div>
        </>
      ) : (
        <OAuthButton provider="github" />
      )}
    </IdentityPanel>
  );
}

export function PendingPage() {
  return (
    <Suspense
      fallback={
        <IdentityPanel title="계정 상태 확인 중">
          <p className="min-h-12 text-sm leading-6 text-(--color-ink-2)">
            잠시만 기다려 주세요.
          </p>
        </IdentityPanel>
      }
    >
      <PendingContent />
    </Suspense>
  );
}
