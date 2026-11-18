"use client";

import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { clearSession, getAccessToken } from "@/entities/user";
import { api, subscribeApiErrors } from "@/shared/api";

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

export function IdentityProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const client = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    const unsubscribe = subscribeApiErrors((error) => {
      if (error.status === 401) {
        clearSession();
        client.clear();
        router.replace("/login");
      } else if (error.code === "SUSPENDED" || error.code === "REJECTED") {
        clearSession(error.code);
        client.clear();
        router.replace(`/pending?status=${error.code}`);
      } else if (
        error.code === "ONBOARDING_REQUIRED" ||
        error.code === "PENDING_APPROVAL"
      ) {
        client.clear();
        router.replace("/pending");
      } else if (error.code === "ACCESS_DENIED") {
        client.clear();
        router.replace("/me");
      }
    });
    return unsubscribe;
  }, [client, router]);
  return children;
}
