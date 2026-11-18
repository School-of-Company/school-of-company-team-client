"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui";
import { logout } from "../model/logout";

export function LogoutButton({
  appearance = "button",
  label = "로그아웃",
}: {
  readonly appearance?: "button" | "link";
  readonly label?: string;
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
      {mutation.isPending ? "로그아웃하는 중" : label}
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
