"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useAccessToken,
  useAccountRestriction,
  useMe,
  useSessionReady,
  userDestination,
} from "@/entities/user";
import {
  authErrorMessage,
  IdentityPanel,
  LogoutButton,
  OAuthButton,
} from "@/features/auth";
import { ErrorState, Spinner } from "@/shared/ui";

export function ConnectDiscordPage() {
  const me = useMe();
  const token = useAccessToken();
  const ready = useSessionReady();
  const restriction = useAccountRestriction();
  const router = useRouter();
  useEffect(() => {
    if (restriction) router.replace(`/pending?status=${restriction}`);
    else if (ready && !token) router.replace("/login");
    else if (me.data && userDestination(me.data) !== "/connect-discord")
      router.replace(userDestination(me.data));
  }, [ready, token, me.data, router, restriction]);
  return (
    <IdentityPanel title="Discord 계정을 연결해 주세요">
      {me.isError ? (
        <ErrorState
          description={authErrorMessage(me.error)}
          onRetry={() => {
            void me.refetch();
          }}
        />
      ) : !me.data || !token ? (
        <Spinner label="계정 상태 확인 중" />
      ) : (
        <>
          <p className="text-sm leading-6 text-muted">
            가입이 승인되었습니다. 업무 알림과 논의를 위해 Discord 연결이
            필요합니다. 연결을 해제해도 기존 업무와 기록은 보존됩니다.
          </p>
          <OAuthButton provider="discord" />
          <LogoutButton />
        </>
      )}
    </IdentityPanel>
  );
}
