"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  discordRequired,
  useAccessToken,
  useAccountRestriction,
  useMe,
  userAvatarUrl,
  useSessionReady,
} from "@/entities/user";
import {
  authErrorCode,
  authErrorMessage,
  IdentityPanel,
  LogoutButton,
  OAuthButton,
  postLoginDestination,
} from "@/features/auth";
import { Avatar, Button } from "@/shared/ui";

/** 지금 확인을 누른 뒤 결과 문구를 보여 주는 시간. 그 뒤에는 기본 안내로 돌아간다. */
const RESULT_MS = 2400;
/** 응답이 빨라도 '확인 중…'이 깜빡이지 않게 잡아 두는 최소 시간. */
const MIN_CHECK_MS = 600;

type CheckPhase = "idle" | "checking" | "result";

function PendingSteps({ discord }: { readonly discord: boolean }) {
  const steps = discord
    ? ["가입 승인", "Discord 연결", "팀 공간에서 시작"]
    : ["가입 승인", "팀 공간에서 시작"];
  return (
    <ol className="ui-pending-steps" aria-label="다음 단계">
      {steps.map((label, index) => (
        <li key={label} aria-current={index === 0 ? "step" : undefined}>
          <span className="ui-pending-step-marker" aria-hidden="true">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">{label}</span>
          {index === 0 ? (
            <span className="ui-pending-step-tag">지금 단계</span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

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
      router.replace(postLoginDestination(me.data));
    else if (ready && !token && !terminal) router.replace("/login");
  }, [me.data, ready, token, terminal, router]);
  const title =
    status === "REJECTED"
      ? "가입 승인이 거절됐어요"
      : status === "SUSPENDED"
        ? "이용이 중지됐어요"
        : "가입 승인을 기다리고 있어요";
  const [phase, setPhase] = useState<CheckPhase>("idle");
  const resultTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(resultTimer.current), []);
  const checking = !ready || (Boolean(token) && me.isPending);
  const checkNow = async () => {
    if (phase === "checking") return;
    clearTimeout(resultTimer.current);
    setPhase("checking");
    const [result] = await Promise.all([
      me.refetch(),
      new Promise((resolve) => setTimeout(resolve, MIN_CHECK_MS)),
    ]);
    // 실패하면 아래 alert 가 알린다. 승인됐으면 위 effect 가 화면을 넘긴다.
    if (result.isError) return setPhase("idle");
    setPhase("result");
    resultTimer.current = setTimeout(() => setPhase("idle"), RESULT_MS);
  };
  const statusText =
    phase === "checking"
      ? "확인 중…"
      : phase === "result"
        ? terminal
          ? "아직 상태가 바뀌지 않았어요"
          : "아직 승인 전이에요"
        : terminal || checking
          ? null
          : "승인되면 자동으로 넘어가요";
  const account = me.data;
  return (
    <IdentityPanel
      title={checking ? "계정 상태를 확인하고 있어요" : title}
      variant="login"
    >
      <p className="ui-pending-lead">
        {checking
          ? "잠시만 기다려 주세요."
          : terminal
            ? "관리자에게 계정 상태를 문의해 주세요."
            : "헤드 어드민이 승인하면 바로 시작할 수 있어요."}
      </p>
      {terminal ? null : (
        <PendingSteps discord={account ? discordRequired(account) : true} />
      )}
      {me.isError && !terminal && !checking ? (
        <p role="alert" className="text-sm text-danger">
          {authErrorMessage(me.error)}
        </p>
      ) : null}
      {token || checking ? (
        <>
          <div className="ui-pending-check">
            <p role="status" className="ui-pending-status">
              {statusText ? (
                <span key={statusText} className="ui-pending-status-text">
                  {phase === "idle" ? (
                    <span className="ui-live-dot" aria-hidden="true" />
                  ) : null}
                  {statusText}
                </span>
              ) : null}
            </p>
            <Button
              variant="secondary"
              className="ui-button-sm"
              disabled={checking}
              aria-disabled={phase === "checking" || undefined}
              onClick={() => {
                void checkNow();
              }}
            >
              지금 확인
            </Button>
          </div>
          <div className="ui-pending-account">
            {account ? (
              <span className="flex min-w-0 items-center gap-2">
                <Avatar name={account.name} src={userAvatarUrl(account)} />
                <span className="truncate">
                  {account.githubLogin
                    ? `@${account.githubLogin}`
                    : account.name}
                </span>
              </span>
            ) : (
              <span />
            )}
            <LogoutButton appearance="link" label="다른 계정으로 로그인" />
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
        <IdentityPanel title="계정 상태를 확인하고 있어요" variant="login">
          <p className="ui-pending-lead">잠시만 기다려 주세요.</p>
        </IdentityPanel>
      }
    >
      <PendingContent />
    </Suspense>
  );
}
