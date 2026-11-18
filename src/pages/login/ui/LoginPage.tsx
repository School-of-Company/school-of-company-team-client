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
    <IdentityPanel title="팀의 업무를 한곳에서">
      <p className="text-sm leading-6 text-muted">
        GitHub 계정으로 시작하세요. 가입 승인 후 Discord 계정을 연결하면 팀
        업무를 이용할 수 있습니다.
      </p>
      <OAuthButton provider="github" />
      <p className="text-xs leading-5 text-muted">
        신규 가입은 관리자의 승인이 필요합니다.
      </p>
    </IdentityPanel>
  );
}
