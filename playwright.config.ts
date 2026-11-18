import { defineConfig, devices } from "@playwright/test";

/**
 * 격리 스택 대상 E2E(로컬·검증 workspace 전용, CI 에는 넣지 않는다).
 * 실행 전 준비(계획 3.3): Postgres → backend(legacy 로그인 켬) → `pnpm dev --port 3101`.
 * 필요한 환경 변수: E2E_ADMIN_PASSWORD(backend ADMIN_PASSWORD 와 같은 값).
 * 선택: E2E_BASE_URL(기본 http://localhost:3101), E2E_API_URL(기본 http://localhost:18081).
 */
export default defineConfig({
  testDir: "e2e",
  // bun test 가 *.test/*.spec 을 집어 가지 않도록 별도 접미사를 쓴다.
  testMatch: "**/*.e2e.ts",
  globalSetup: "./e2e/seed.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3101",
    locale: "ko-KR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
