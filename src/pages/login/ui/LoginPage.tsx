"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe, userDestination } from "@/entities/user";
import { IdentityPanel, OAuthButton } from "@/features/auth";

export function LoginPage() {
  const me = useMe();
  const router = useRouter();
  useEffect(() => {
    if (me.data) router.replace(userDestination(me.data));
  }, [me.data, router]);
  return (
    <IdentityPanel title="로그인" variant="login">
      <OAuthButton provider="github" />
      <p className="ui-login-note">처음이면 관리자 승인 후 이용할 수 있어요.</p>
    </IdentityPanel>
  );
}
