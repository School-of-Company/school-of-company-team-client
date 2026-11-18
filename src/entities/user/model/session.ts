"use client";

import { useSyncExternalStore } from "react";
import type { SessionTokens } from "./types";

const ACCESS_KEY = "soc.access-token";
const REFRESH_KEY = "soc.refresh-token";
const RESTRICTION_KEY = "soc.account-restriction";
const listeners = new Set<() => void>();
const sessionChangeListeners = new Set<() => void>();

export function subscribeSessionChanges(listener: () => void) {
  sessionChangeListeners.add(listener);
  return () => {
    sessionChangeListeners.delete(listener);
  };
}

export function getAccessToken(): string | null {
  return typeof window === "undefined"
    ? null
    : sessionStorage.getItem(ACCESS_KEY);
}

export function replaceSession(tokens: SessionTokens) {
  sessionChangeListeners.forEach((listener) => listener());
  sessionStorage.removeItem(RESTRICTION_KEY);
  sessionStorage.setItem(ACCESS_KEY, tokens.accessToken);
  sessionStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  listeners.forEach((listener) => listener());
}

export function clearSession(restriction?: "REJECTED" | "SUSPENDED") {
  sessionChangeListeners.forEach((listener) => listener());
  if (restriction) sessionStorage.setItem(RESTRICTION_KEY, restriction);
  else sessionStorage.removeItem(RESTRICTION_KEY);
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

export function useSessionReady() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function useAccountRestriction() {
  return useSyncExternalStore(
    subscribe,
    () => {
      const value = sessionStorage.getItem(RESTRICTION_KEY);
      return value === "REJECTED" || value === "SUSPENDED" ? value : null;
    },
    () => null,
  );
}
