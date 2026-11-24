"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@/shared/ui";
import { beginOAuth, type OAuthProvider } from "../api/oauth";
import { authErrorMessage } from "../model/error-message";

export function OAuthButton({
  provider,
}: {
  readonly provider: OAuthProvider;
}) {
  const mutation = useMutation({
    mutationFn: () => beginOAuth(provider),
    retry: false,
  });
  return (
    <div className="grid gap-3">
      {mutation.isError && (
        <p role="alert" className="text-sm text-danger">
          {authErrorMessage(mutation.error)}
        </p>
      )}
      <Button
        loading={mutation.isPending || mutation.isSuccess}
        onClick={() => mutation.mutate()}
      >
        {provider === "github" ? "GitHub로 로그인" : "Discord 계정 연결"}
      </Button>
    </div>
  );
}
