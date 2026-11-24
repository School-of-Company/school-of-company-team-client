import { test, expect } from "@playwright/test";
import type { KnowledgeSummary } from "../src/entities/knowledge/model/types";

test("an empty placeholder does not claim the new document filter has zero results", async ({
  page,
}) => {
  const document: KnowledgeSummary = {
    id: "draft-document",
    kind: "ADR",
    title: "초안 결정 문서",
    status: "DRAFT",
    author: null,
    project: null,
    updatedAt: "2026-11-24T00:00:00Z",
  };
  await page.addInitScript(() => {
    sessionStorage.setItem("soc.access-token", "fixture");
    sessionStorage.setItem("soc.refresh-token", "fixture");
  });
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/v1/me") {
      await route.fulfill({
        json: {
          id: "viewer",
          username: "viewer",
          name: "팀원",
          major: null,
          role: "MEMBER",
          status: "ACTIVE",
          createdAt: document.updatedAt,
          githubId: null,
          githubLogin: null,
          discordLinked: true,
          discordUsername: null,
        },
      });
    } else if (url.pathname === "/api/v1/knowledge") {
      if (url.searchParams.get("status") === "DRAFT") {
        await held;
        await route.fulfill({ json: [document] });
      } else await route.fulfill({ json: [] });
    } else await route.fulfill({ json: [] });
  });
  await page.goto("/docs?status=PUBLISHED");
  await expect(
    page.getByText("조건에 맞는 문서가 없습니다", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("상태", { exact: true }).selectOption("DRAFT");
  try {
    await expect(
      page.getByText("문서 불러오는 중", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("조건에 맞는 문서가 없습니다", { exact: true }),
    ).toBeHidden();
    await expect(page.locator("main .page-subtitle")).toBeHidden();
  } finally {
    release();
  }
  await expect(
    page.getByRole("link", { name: /초안 결정 문서/ }),
  ).toBeVisible();
  await expect(page.locator("main .page-subtitle")).toHaveText("전체 1개");
});
