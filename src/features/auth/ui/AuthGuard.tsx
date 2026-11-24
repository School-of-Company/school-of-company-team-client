"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  useAccessToken,
  useAccountRestriction,
  useSessionReady,
  useMe,
  type User,
} from "@/entities/user";
import { ErrorState, PageSkeleton } from "@/shared/ui";
import { authErrorCode, authErrorMessage } from "../model/error-message";
import { guardDestination } from "../model/guard-destination";
import { guardView } from "../model/guard-view";

export function AuthGuard({
  children,
  require = "work",
  fallback = <PageSkeleton label="계정 상태 확인 중" />,
}: {
  readonly require?: "work" | "account";
  /** 확인 중에 그릴 자리. 머리글 모양이 다른 화면(상세)은 자기 스켈레톤을 넘긴다. */
  readonly fallback?: ReactNode;
  readonly children: ReactNode | ((user: User) => ReactNode);
}) {
  const router = useRouter();
  const ready = useSessionReady();
  const token = useAccessToken();
  const restriction = useAccountRestriction();
  const me = useMe();
  const destination = me.data ? guardDestination(me.data, require) : undefined;
  const code = authErrorCode(me.error);
  useEffect(() => {
    if (restriction) router.replace(`/pending?status=${restriction}`);
    else if (ready && !token) router.replace("/login");
    else if (destination) router.replace(destination);
    else if (code === "SUSPENDED" || code === "REJECTED")
      router.replace(`/pending?status=${code}`);
  }, [ready, token, destination, code, router, restriction]);

  const view = guardView({
    ready,
    hasToken: Boolean(token),
    isError: me.isError,
    hasUser: Boolean(me.data),
    redirecting: destination !== undefined && destination !== null,
  });
  if (view === "error")
    return (
      <ErrorState
        description={authErrorMessage(me.error)}
        onRetry={() => {
          void me.refetch();
        }}
      />
    );
  // 하드 새로고침 때 세션은 hydration 뒤에야 읽힌다. 화면 머리글과 같은 모양의 자리를 먼저 그려 본문이 튀지 않게 한다.
  if (view === "loading" || !me.data) return fallback;
  return typeof children === "function" ? children(me.data) : children;
}
