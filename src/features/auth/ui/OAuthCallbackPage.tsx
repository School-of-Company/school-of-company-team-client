"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getMe, userDestination } from "@/entities/user";
import { completeOAuth, type OAuthProvider } from "../api/oauth";
import { authErrorMessage } from "../model/error-message";
import { IdentityPanel } from "./IdentityPanel";
import { OAuthButton } from "./OAuthButton";

export function OAuthCallbackPage({
  provider,
}: {
  readonly provider: OAuthProvider;
}) {
  const [error, setError] = useState<unknown>(null);
  const router = useRouter();
  const client = useQueryClient();
  const callbackSearch = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    callbackSearch.current ??= window.location.search;
    const exchange = completeOAuth(provider, callbackSearch.current);
    window.history.replaceState(null, "", window.location.pathname);
    exchange
      .then(async () => {
        client.clear();
        const user = await getMe();
        if (active) router.replace(userDestination(user));
      })
      .catch((reason: unknown) => {
        if (active) setError(reason);
      });
    return () => {
      active = false;
    };
  }, [provider, router, client]);
  return (
    <IdentityPanel
      title={provider === "github" ? "GitHub 로그인" : "Discord 연결"}
    >
      {error ? (
        <>
          <p role="alert" className="min-h-12 text-sm leading-6 text-danger">
            {authErrorMessage(error)}
          </p>
          <OAuthButton provider={provider} />
        </>
      ) : (
        <p role="status" className="ui-identity-status">
          {provider === "github"
            ? "GitHub 계정을 확인하고 있어요"
            : "Discord 연결을 마무리하고 있어요"}
        </p>
      )}
    </IdentityPanel>
  );
}
