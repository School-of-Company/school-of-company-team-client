"use client";

import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  rotateSession,
  type SessionTokens,
} from "@/entities/user";
import { rememberReturnPath } from "../model/return-path";
import { clearCacheOnSessionChange } from "../model/session-cache";
import { api, setAccessRefresher, subscribeApiErrors } from "@/shared/api";

// One refresh at a time: parallel 401s share the same request.
let refreshing: Promise<boolean> | null = null;
setAccessRefresher(() => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(false);
  refreshing ??= axios
    .post<SessionTokens>(
      "/api/v1/auth/refresh",
      { refreshToken },
      { baseURL: api.defaults.baseURL, timeout: 15_000 },
    )
    .then(
      ({ data }) => {
        rotateSession(data);
        return true;
      },
      () => false,
    )
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
});

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
  useEffect(() => clearCacheOnSessionChange(client), [client]);
  useEffect(() => {
    const unsubscribe = subscribeApiErrors((error) => {
      if (error.status === 401) {
        clearSession();
        rememberReturnPath();
        router.replace("/login");
      } else if (error.code === "SUSPENDED" || error.code === "REJECTED") {
        clearSession(error.code);
        router.replace(`/pending?status=${error.code}`);
      } else if (
        error.code === "ONBOARDING_REQUIRED" ||
        error.code === "PENDING_APPROVAL"
      ) {
        client.clear();
        router.replace("/pending");
      } else if (error.code === "ACCESS_DENIED") {
        client.clear();
        router.replace("/");
      }
    });
    return unsubscribe;
  }, [client, router]);
  return children;
}
