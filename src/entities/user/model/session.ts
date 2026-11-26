"use client";

import { useSyncExternalStore } from "react";
import type { SessionTokens } from "./types";

const ACCESS_KEY = "soc.access-token";
const REFRESH_KEY = "soc.refresh-token";
const RESTRICTION_KEY = "soc.account-restriction";
const listeners = new Set<() => void>();
const sessionChangeListeners = new Set<() => void>();

/**
 * 첫 그림 전에(app/layout.tsx head) 액세스 토큰의 role 클레임을 html data-session-role 에 적는다.
 * 내 정보가 오기 전 관리자 메뉴 자리를 잡는 화면 표시용 짐작이며 권한 판단에 쓰지 않는다(서버와 화면이 따로 검사한다).
 */
export const sessionRoleBootScript = `(function(){try{var t=sessionStorage.getItem("${ACCESS_KEY}"),p=t&&t.split(".")[1],r=p&&JSON.parse(atob(p.replace(/-/g,"+").replace(/_/g,"/"))).role;if(typeof r==="string")document.documentElement.dataset.sessionRole=r}catch(e){}})();`;

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

export function getRefreshToken(): string | null {
  return typeof window === "undefined"
    ? null
    : sessionStorage.getItem(REFRESH_KEY);
}

/** Same user, new tokens: no session-change notification, so caches stay. */
export function rotateSession(tokens: SessionTokens) {
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
