"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui";
import { logout } from "../model/logout";

export function LogoutButton() {
  const client = useQueryClient();
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      client.clear();
      router.replace("/login");
    },
  });
  return (
    <Button
      variant="ghost"
      loading={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      로그아웃
    </Button>
  );
}
