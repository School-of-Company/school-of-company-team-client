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
  postLoginDestination,
} from "@/features/auth";
import { ErrorState } from "@/shared/ui";

export function ConnectDiscordPage() {
  const me = useMe();
  const token = useAccessToken();
  const ready = useSessionReady();
  const restriction = useAccountRestriction();
  const router = useRouter();
  // 이미 연결한 사용자는 이동할 곳으로 보낸다. 그 사이 연결 안내를 그렸다 지우지 않고 확인 중 문구를 그대로 둔다.
  const leaving = !!me.data && userDestination(me.data) !== "/connect-discord";
  useEffect(() => {
    if (restriction) router.replace(`/pending?status=${restriction}`);
    else if (ready && !token) router.replace("/login");
    else if (leaving && me.data) router.replace(postLoginDestination(me.data));
  }, [ready, token, me.data, leaving, router, restriction]);
  return (
    <IdentityPanel title="Discord 계정을 연결해 주세요">
      {me.isError ? (
        <ErrorState
          description={authErrorMessage(me.error)}
          onRetry={() => {
            void me.refetch();
          }}
        />
      ) : !me.data || !token || leaving ? (
        <p className="min-h-12 text-sm leading-6 text-foreground-2">
          계정 상태를 확인하고 있어요.
        </p>
      ) : (
        <>
          <p className="min-h-12 text-sm leading-6 text-foreground-2">
            승인됐어요. 업무 알림과 논의를 위해 Discord를 연결해 주세요.
          </p>
          <OAuthButton provider="discord" />
          <div className="pt-2">
            <LogoutButton appearance="link" label="다른 계정으로 로그인" />
          </div>
        </>
      )}
    </IdentityPanel>
  );
}
