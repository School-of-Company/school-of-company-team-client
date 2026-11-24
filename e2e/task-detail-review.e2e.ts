import { test, expect } from "@playwright/test";
import { stubDetail, taskFixture } from "./task-detail-feedback.fixture";

for (const released of ["hover", "focus"] as const)
  test(`toast pause: ${released} 해제 후에도 다른 상호작용이 유지되면 사라지지 않는다`, async ({
    page,
  }) => {
    await stubDetail(page);
    await page.goto(`/tasks/${taskFixture.id}`);
    const status = page.getByRole("combobox", { name: "상태 변경" });
    await expect(status).toBeVisible();
    await page.clock.install();
    await status.selectOption("DONE");
    const toast = page.locator(".ui-toast");
    await expect(toast).toBeVisible();
    await toast.hover();
    await toast.getByRole("button", { name: "알림 닫기" }).focus();
    if (released === "hover") await page.mouse.move(0, 0);
    else await status.focus();
    await page.clock.runFor(4000);
    await expect(toast).not.toHaveAttribute("data-closing", "true");
    await expect(toast).toBeVisible();
    if (released === "hover") await status.focus();
    else await page.mouse.move(0, 0);
    await page.clock.runFor(3500);
    await expect(toast).toHaveCount(0);
  });

for (const surface of ["page", "panel"] as const)
  test(`delete success: ${surface}에서 한 번 삭제하고 토스트 하나를 표시한다`, async ({
    page,
  }) => {
    await stubDetail(page);
    let deletes = 0;
    await page.route(`**/api/v1/tasks/${taskFixture.id}`, async (route) => {
      if (route.request().method() !== "DELETE") return route.fallback();
      deletes++;
      await route.fulfill({ status: 204 });
    });
    await page.goto(
      surface === "page"
        ? `/tasks/${taskFixture.id}`
        : `/me?task=${taskFixture.id}`,
    );
    await page
      .locator(".task-detail")
      .getByRole("button", { name: "삭제", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "업무를 삭제할까요?" })
      .getByRole("button", { name: "삭제", exact: true })
      .click();
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.locator(".ui-toast")).toHaveCount(1);
    await expect(page.locator(".ui-toast").getByRole("status")).toHaveText(
      "업무를 삭제했습니다.",
    );
    expect(deletes).toBe(1);
  });
