import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

export type Tokens = { accessToken: string; refreshToken: string };
export type SeedUser = { id: string; name: string; tokens: Tokens };
export type Seed = {
  run: string;
  admin: Tokens;
  member: SeedUser;
  outsider: SeedUser;
  project: { id: string; key: string; name: string };
};

export const apiUrl = process.env.E2E_API_URL ?? "http://localhost:18081";
export const seedFile = "e2e/.auth/seed.json";
export const readSeed = (): Seed => JSON.parse(readFileSync(seedFile, "utf8"));

/** legacy 로그인 토큰을 앱이 읽는 sessionStorage 키에 넣는다. 앱이 토큰을 갱신하면 그 값을 덮어쓰지 않는다. */
export async function signIn(page: Page, tokens: Tokens) {
  await page.addInitScript((value) => {
    if (sessionStorage.getItem("soc.access-token")) return;
    sessionStorage.setItem("soc.access-token", value.accessToken);
    sessionStorage.setItem("soc.refresh-token", value.refreshToken);
  }, tokens);
}

/** 화면 동작이 서버에 실제로 반영됐는지 API 로 확인한다. */
export async function apiGet<T>(path: string, tokens: Tokens): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { authorization: `Bearer ${tokens.accessToken}` },
  });
  if (!response.ok) throw new Error(`GET ${path} → ${response.status}`);
  return (await response.json()) as T;
}
