import { mkdirSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { stubDetail, taskFixture } from "./task-detail-feedback.fixture";

const phase = process.env.FEEDBACK_PHASE ?? "after";
const dir = process.env.E2E_SCREENSHOT_DIR ?? "/tmp/task-detail-feedback";

for (const colorScheme of ["light", "dark"] as const)
  for (const width of [1440, 390])
    for (const surface of [
      "page",
      "panel",
      "project-page",
      "project-panel",
    ] as const)
      test(`${surface} ${colorScheme} ${width}`, async ({ browser }) => {
        const context = await browser.newContext({
          colorScheme,
          viewport: { width, height: 1000 },
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        const panel = surface.endsWith("panel");
        await stubDetail(
          page,
          surface.startsWith("project") ? "PROJECT" : "PERSONAL",
        );
        await page.goto(
          !panel
            ? `/tasks/${taskFixture.id}`
            : `${surface === "project-panel" ? "/projects/fixture-project" : "/me"}?task=${taskFixture.id}`,
        );
        const detail = page.locator(".task-detail");
        await expect(
          detail.getByRole("heading", { name: taskFixture.title }),
        ).toBeVisible();
        await expect(
          detail.getByRole("heading", { name: "GitHub", exact: true }),
        ).toBeVisible();
        await page.addStyleTag({
          content: "nextjs-portal { display: none !important; }",
        });
        mkdirSync(`${dir}/${phase}`, { recursive: true });
        await page.screenshot({
          path: `${dir}/${phase}/${surface}-${colorScheme}-${width}.png`,
          fullPage: true,
        });
        if (panel) {
          await detail
            .getByRole("heading", { name: "GitHub", exact: true })
            .scrollIntoViewIfNeeded();
          await page.screenshot({
            path: `${dir}/${phase}/${surface}-bottom-${colorScheme}-${width}.png`,
            fullPage: true,
          });
          await detail
            .getByRole("heading", { name: taskFixture.title })
            .scrollIntoViewIfNeeded();
        }
        if (phase === "before") {
          await detail
            .getByRole("combobox", { name: "상태 변경" })
            .selectOption("DONE");
          await expect(detail.getByText("상태를 변경했습니다.")).toBeVisible();
          await page.screenshot({
            path: `${dir}/${phase}/toast-${surface}-${colorScheme}-${width}.png`,
            fullPage: true,
          });
        }
        if (phase === "after") {
          await expect(detail).not.toContainText("·");
          await expect(
            detail.getByRole("link", { name: /보드로 돌아가기/ }),
          ).toHaveCount(panel ? 0 : 1);
          await expect(
            detail.getByRole("textbox", { name: "기존 Issue, PR URL" }),
          ).toBeHidden();
          await detail
            .locator("summary", { hasText: "Issue, PR 연결" })
            .click();
          await expect(
            detail.getByRole("textbox", { name: "기존 Issue, PR URL" }),
          ).toBeVisible();
          await detail
            .getByRole("combobox", { name: "상태 변경" })
            .selectOption("DONE");
          const toast = page
            .locator(".ui-toast")
            .filter({ hasText: "상태를 변경했습니다." });
          await expect(toast).toBeVisible();
          await expect(toast).toHaveCSS("animation-name", "none");
          await expect(detail.getByText("상태를 변경했습니다.")).toHaveCount(0);
          await page.screenshot({
            path: `${dir}/${phase}/toast-${surface}-${colorScheme}-${width}.png`,
            fullPage: true,
          });
          await page.mouse.move(0, 0);
          await expect(toast).toBeHidden({ timeout: 5000 });
          await detail
            .getByRole("combobox", { name: "상태 변경" })
            .selectOption("PLANNED");
          await expect(page.locator(".ui-toast")).toHaveCount(1);
          await page
            .getByRole("button", { name: "알림 닫기" })
            .click({ timeout: 3000 });
          await expect(page.locator(".ui-toast")).toHaveCount(0);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);
        }
        await context.close();
      });

test("알림은 쌓이고 오류는 오래 유지되며 수정 저장도 토스트로 알린다", async ({
  page,
}) => {
  test.skip(phase === "before", "변경 후 피드백 동작");
  await stubDetail(page);
  await page.goto(`/me?task=${taskFixture.id}`);
  const detail = page.locator(".task-detail");
  const status = detail.getByRole("combobox", { name: "상태 변경" });
  await expect(status).toBeVisible();
  await page.clock.install();
  await status.selectOption("DONE");
  await expect(page.locator(".ui-toast")).toHaveCount(1);
  await status.selectOption("PLANNED");
  await expect(page.locator(".ui-toast")).toHaveCount(2);
  await page.mouse.move(0, 0);
  await page.clock.fastForward(3500);
  await expect(page.locator(".ui-toast")).toHaveCount(0);
  await page.route("**/api/v1/tasks/*/position", (route) =>
    route.fulfill({
      status: 500,
      json: { code: "FAILED", message: "변경하지 못했습니다." },
    }),
  );
  await status.selectOption("DONE");
  const error = page.locator(".ui-toast[data-tone=error]");
  await expect(error.getByRole("alert")).toHaveText("변경하지 못했습니다.");
  await page.clock.fastForward(3500);
  await expect(error).toBeVisible();
  await error.getByRole("button", { name: "알림 닫기" }).click();
  await page.clock.fastForward(250);
  await expect(error).toHaveCount(0);
  await detail.getByRole("button", { name: "수정", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "업무 수정" });
  await editor.getByRole("textbox", { name: "제목" }).fill("수정한 업무 제목");
  await editor.getByRole("button", { name: "변경 저장", exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(
    detail.getByRole("heading", { name: "수정한 업무 제목" }),
  ).toBeVisible();
  await expect(page.locator(".ui-toast").getByRole("status")).toHaveText(
    "업무를 수정했습니다.",
  );
});

test("GitHub URL 검증 오류는 입력 옆에 남기고 입력값을 보존한다", async ({
  page,
}) => {
  test.skip(phase === "before", "변경 후 검증 오류 표시");
  await stubDetail(page);
  await page.route("**/api/v1/tasks/*/github/links", (route) =>
    route.fulfill({
      status: 422,
      json: {
        code: "INVALID_URL",
        message: "Issue 또는 PR 주소를 입력해 주세요.",
      },
    }),
  );
  await page.goto(`/tasks/${taskFixture.id}`);
  const detail = page.locator(".task-detail");
  await detail.locator("summary", { hasText: "Issue, PR 연결" }).click();
  const input = detail.getByRole("textbox", { name: "기존 Issue, PR URL" });
  await input.fill("https://example.com/wrong");
  await detail.getByRole("button", { name: "연결", exact: true }).click();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveValue("https://example.com/wrong");
  await expect(detail.locator("#github-link-error")).toHaveText(
    "Issue 또는 PR 주소를 입력해 주세요.",
  );
  await expect(page.locator(".ui-toast")).toHaveCount(0);
});
