import { expect, test } from "@playwright/test";
import { readSeed, signIn } from "./support";

// 화면 이동 뒤 포커스가 body 로 떨어지지 않고 본문(main)으로 가며, 새 화면 제목을 스크린리더 영역에 알린다.
// 쿼리만 바뀌는 조작은 포커스를 건드리지 않는다. 격리 backend 실제 API.
const seed = readSeed();
const main = "main#main-content";
const live = 'p[role="status"][aria-live="polite"].sr-only';

test("사이드바 링크로 이동하면 본문으로 포커스가 가고 새 화면 제목을 알린다", async ({
  page,
}) => {
  await signIn(page, seed.member.tokens);
  await page.goto("/me");
  await expect(
    page.getByRole("heading", { level: 1, name: "내 보드" }),
  ).toBeVisible();
  const link = page.getByRole("link", { name: "팀 공용", exact: true }).first();
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/team$/);
  await expect(page.locator(main)).toBeFocused();
  await expect(page.locator(live)).toHaveText("팀 공용 보드 화면");
  // 본문에서 Tab 하면 새 화면의 첫 조작 요소로 간다(처음부터 사이드바를 다시 지나지 않는다).
  await page.keyboard.press("Tab");
  await expect(page.locator(`${main} :focus`)).toHaveCount(1);
});

test("본문 링크로 이동한 뒤 뒤로가기를 해도 포커스가 body 로 떨어지지 않는다", async ({
  page,
}) => {
  await signIn(page, seed.member.tokens);
  await page.goto("/projects");
  const link = page
    .locator(main)
    .getByRole("link", { name: new RegExp(seed.project.name) });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/projects/${seed.project.id}$`));
  await expect(page.locator(main)).toBeFocused();
  await expect(page.locator(live)).toHaveText(`${seed.project.name} 화면`);
  await page.goBack();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.locator(main)).toBeFocused();
  await expect(page.locator(live)).toHaveText("프로젝트 화면");
});

test("쿼리만 바뀌는 조작(그룹 선택)은 포커스를 그 자리에 둔다", async ({
  page,
}) => {
  await signIn(page, seed.member.tokens);
  await page.goto(`/projects/${seed.project.id}`);
  const chip = page.getByRole("button", { name: /그룹/ });
  await chip.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  // 그룹 없음 → 버킷별 → 담당자별
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/groupBy=owner/);
  await expect(chip).toBeFocused();
});

test("프로젝트 아카이브 인라인 확인을 취소하면 아카이브 버튼으로 돌아온다", async ({
  page,
}) => {
  await signIn(page, seed.admin);
  await page.goto(`/projects/${seed.project.id}/settings`);
  const archive = page.getByRole("button", { name: "프로젝트 아카이브" });
  await archive.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("alert").filter({ hasText: "프로젝트를 아카이브할까요?" }),
  ).toBeVisible();
  const cancel = page.getByRole("button", { name: "취소" });
  await cancel.focus();
  await page.keyboard.press("Enter");
  await expect(cancel).toHaveCount(0);
  await expect(archive).toBeFocused();
  await expect(archive).toHaveText("프로젝트 아카이브");
});

test("뒤로가기는 이전 스크롤 위치를 지키고(본문 포커스가 화면을 끌어올리지 않음) 포커스는 본문에 둔다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 420 });
  await signIn(page, seed.admin);
  await page.goto(`/projects/${seed.project.id}/settings?tab=general`);
  await expect(page.getByRole("heading", { name: "기본 정보" })).toBeVisible();
  // 마우스 휠은 위치에 따라 사이드바만 굴릴 수 있어 문서를 직접 내린다.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(100);
  const before = await page.evaluate(() => window.scrollY);
  await page
    .getByRole("link", { name: "팀 공용", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/team$/);
  await expect(page.locator(main)).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/\/settings/);
  await expect(page.locator(main)).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before);
});
