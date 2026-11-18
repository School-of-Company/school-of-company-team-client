"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api";
import { BOARD_POLL_INTERVAL } from "@/shared/config";
import { useAccessToken } from "../model/session";
import type { UpdateProfile, User } from "../model/types";

export const meQueryKey = ["identity", "me"] as const;

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/api/v1/me");
  return data;
}

export async function updateProfile(profile: UpdateProfile): Promise<User> {
  const { data } = await api.patch<User>("/api/v1/me", profile);
  return data;
}

export function useMe() {
  const token = useAccessToken();
  return useQuery({
    queryKey: meQueryKey,
    queryFn: getMe,
    enabled: Boolean(token),
    retry: false,
    staleTime: BOARD_POLL_INTERVAL,
    refetchInterval: BOARD_POLL_INTERVAL,
  });
}
