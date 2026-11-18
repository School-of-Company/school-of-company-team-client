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
    <IdentityPanel
      title="팀의 업무를 한곳에서"
      lead="GitHub 계정으로 시작하세요."
    >
      <div className="max-w-xs">
        <OAuthButton provider="github" />
      </div>
      <ol
        aria-label="이용 절차"
        className="mt-10 grid gap-6 border-t border-border pt-8 sm:grid-cols-3 sm:gap-8"
      >
        {steps.map((step, index) => (
          <li key={step.title} className="grid content-start gap-1.5">
            <span className="font-mono text-xs text-muted">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-[0.9375rem] font-semibold">{step.title}</span>
            <span className="text-sm leading-6 text-(--color-ink-2)">
              {step.detail}
            </span>
          </li>
        ))}
      </ol>
    </IdentityPanel>
  );
}
