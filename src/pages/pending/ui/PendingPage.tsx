"use client";

import { Suspense, useEffect } from "react";
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
import { Button, Spinner } from "@/shared/ui";

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
  return (
    <IdentityPanel title={title}>
      {!ready || (token && me.isPending) ? (
        <Spinner label="계정 상태 확인 중" />
      ) : (
        <>
          <p className="text-sm leading-6 text-muted">
            {terminal
              ? "현재 업무 기능을 이용할 수 없습니다. 관리자에게 계정 상태를 문의해 주세요."
              : "관리자가 가입 신청을 확인하고 있습니다. 승인 후 Discord 계정을 연결할 수 있습니다."}
          </p>
          {me.isError && !terminal && (
            <p role="alert" className="text-sm text-danger">
              {authErrorMessage(me.error)}
            </p>
          )}
          {token ? (
            <>
              <Button
                loading={me.isFetching}
                onClick={() => {
                  void me.refetch();
                }}
              >
                상태 다시 확인
              </Button>
              <LogoutButton />
            </>
          ) : (
            <OAuthButton provider="github" />
          )}
        </>
      )}
    </IdentityPanel>
  );
}

export function PendingPage() {
  return (
    <Suspense fallback={<Spinner label="계정 상태 확인 중" />}>
      <PendingContent />
    </Suspense>
  );
}
