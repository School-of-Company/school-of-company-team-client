"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui";
import { logout } from "../model/logout";

export function LogoutButton({
  appearance = "button",
}: {
  readonly appearance?: "button" | "link";
}) {
  const client = useQueryClient();
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      client.clear();
      router.replace("/login");
    },
  });
  return appearance === "link" ? (
    <button
      type="button"
      className="ui-link-button"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {mutation.isPending ? "로그아웃하는 중" : "다른 계정으로 로그인"}
    </button>
  ) : (
    <Button
      variant="ghost"
      loading={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      로그아웃
    </Button>
  );
}
