import { expect, test } from "@playwright/test";
import { readSeed, signIn } from "./support";

// 접어 둔 사이드바 메뉴 묶음은 하드 새로고침의 첫 프레임부터 접혀 있다.
// 수화 중 렌더(서버 스냅숏: 모두 펼침)가 boot script의 `html[data-sidebar-closed]`를 지우면 한 프레임 펼쳐진다(PR #71 리뷰).
const seed = readSeed();

test("접은 묶음은 새로고침 첫 프레임부터 접혀 있고 펼치면 유지된다", async ({
  page,
}) => {
  await signIn(page, seed.member.tokens);
  await page.addInitScript(() => {
    localStorage.setItem("soc.sidebar.group.org", "true");
    const frames: string[] = [];
    (window as unknown as { __frames: string[] }).__frames = frames;
    const tick = () => {
      const body = document.querySelector(
        '.app-sidebar .sidebar-group[data-group="org"] > div',
      );
      if (body) frames.push(getComputedStyle(body).display);
      if (frames.length < 120) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto("/projects");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(500);
  const frames = await page.evaluate(
    () => (window as unknown as { __frames: string[] }).__frames,
  );
  expect(frames.length).toBeGreaterThan(0);
  expect(frames.filter((display) => display !== "none")).toEqual([]);
  await page
    .locator(
      '.app-sidebar .sidebar-group[data-group="org"] .sidebar-group-toggle',
    )
    .click();
  await expect(
    page.locator('.app-sidebar .sidebar-group[data-group="org"] > div'),
  ).toBeVisible();
});
