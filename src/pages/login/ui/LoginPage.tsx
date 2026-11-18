"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe, userDestination } from "@/entities/user";
import { IdentityPanel, OAuthButton } from "@/features/auth";

const steps = [
  {
    title: "GitHub 계정 확인",
    detail: "팀원 확인에 GitHub 계정을 사용합니다.",
  },
  { title: "관리자 승인", detail: "신규 가입은 관리자의 승인이 필요합니다." },
  {
    title: "Discord 계정 연결",
    detail: "연결하면 팀 업무를 이용할 수 있습니다.",
  },
] as const;

export function LoginPage() {
  const me = useMe();
  const router = useRouter();
  useEffect(() => {
    if (me.data) router.replace(userDestination(me.data));
  }, [me.data, router]);
  return (
    <IdentityPanel title="팀의 업무를 한곳에서">
      <p className="text-sm leading-6 text-muted">
        GitHub 계정으로 시작하세요.
      </p>
      <OAuthButton provider="github" />
      <ol
        aria-label="이용 절차"
        className="grid gap-4 border-t border-border pt-6"
      >
        {steps.map((step, index) => (
          <li key={step.title} className="grid grid-cols-[1.75rem_1fr] gap-3">
            <span
              aria-hidden="true"
              className="grid size-7 place-items-center rounded-md border border-border font-mono text-xs text-muted"
            >
              {index + 1}
            </span>
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">{step.title}</span>
              <span className="text-xs leading-5 text-muted">
                {step.detail}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </IdentityPanel>
  );
}
