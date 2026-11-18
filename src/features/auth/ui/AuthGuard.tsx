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
import { ErrorState, Spinner } from "@/shared/ui";
import { authErrorCode, authErrorMessage } from "../model/error-message";
import { guardDestination } from "../model/guard-destination";

export function AuthGuard({
  children,
  require = "work",
}: {
  readonly require?: "work" | "account";
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

  if (me.isError)
    return (
      <ErrorState
        description={authErrorMessage(me.error)}
        onRetry={() => {
          void me.refetch();
        }}
      />
    );
  if (!ready || !token || !me.data || destination !== null)
    return <Spinner label="계정 상태 확인 중" />;
  return typeof children === "function" ? children(me.data) : children;
}
