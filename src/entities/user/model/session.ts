"use client";

import { useSyncExternalStore } from "react";
import type { SessionTokens } from "./types";

const ACCESS_KEY = "soc.access-token";
const REFRESH_KEY = "soc.refresh-token";
const listeners = new Set<() => void>();

export function getAccessToken(): string | null {
  return typeof window === "undefined"
    ? null
    : sessionStorage.getItem(ACCESS_KEY);
}

export function replaceSession(tokens: SessionTokens) {
  sessionStorage.setItem(ACCESS_KEY, tokens.accessToken);
  sessionStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  listeners.forEach((listener) => listener());
}

export function clearSession() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAccessToken() {
  return useSyncExternalStore(subscribe, getAccessToken, () => null);
}
