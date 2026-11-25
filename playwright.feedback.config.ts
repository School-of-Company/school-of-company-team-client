import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  testMatch: [
    "task-detail-*.e2e.ts",
    "knowledge-list-feedback.e2e.ts",
    "admin-row-menu.e2e.ts",
  ],
  workers: 1,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3107" },
  reporter: "list",
});
