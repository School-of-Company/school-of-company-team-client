import { expect, test, type Page } from "@playwright/test";
import { apiUrl, readSeed, signIn, type Tokens } from "./support";

// Next.js(Cache Components)는 떠난 화면을 숨긴 채 남겨 둔다. 숨은 화면이 새 URL 의 쿼리
// (`?milestone=`, `?task=`)로 대화상자를 열면 보이지 않는 모달이 문서 전체를 막는다(V-route-focus H1).
const seed = readSeed();
const unique = () => `${seed.run}-${Date.now().toString(36)}`;

async function api<T>(
  method: string,
  path: string,
  tokens: Tokens,
  body?: unknown,
) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${tokens.accessToken}`,
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status}`);
  return (response.status === 204 ? null : await response.json()) as T;
}

/** 열린 대화상자가 모두 보이는 것인지, 그리고 보드가 클릭·키보드로 조작되는지. */
async function expectBoardUsable(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          [...document.querySelectorAll("dialog")].filter(
            (dialog) => dialog.open && dialog.getClientRects().length === 0,
          ).length,
      ),
    )
    .toBe(0);
  const create = page.getByRole("button", { name: "업무 등록" });
  await create.click();
  const dialog = page.getByRole("dialog", { name: "업무 등록" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(create).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveCount(1);
  expect(
    await page.evaluate(() => document.activeElement === document.body),
  ).toBe(false);
}

test("마일스톤 패널의 '보드에서 보기'로 가도 보드를 클릭·키보드로 조작할 수 있다", async ({
  page,
}) => {
  const name = `숨김 ${unique()}`;
  const milestone = await api<{ id: string }>(
    "POST",
    `/api/v1/projects/${seed.project.id}/milestones`,
    seed.admin,
    { name },
  );
  await signIn(page, seed.member.tokens);
  await page.goto(`/projects/${seed.project.id}/milestones`);
  await page.getByRole("button", { name: new RegExp(name) }).click();
  const panel = page.getByRole("dialog", { name });
  await expect(panel).toBeVisible();
  await panel.getByRole("link", { name: "보드에서 보기" }).click();
  await expect(page).toHaveURL(new RegExp(`milestone=${milestone.id}`));
  await expect(page.getByRole("button", { name: "업무 등록" })).toBeVisible();
  await expectBoardUsable(page);
  // 뒤로가면 Milestone 목록으로 돌아오고, 패널은 다시 열리지 않는다(이동 전에 닫았으므로).
  await page.goBack();
  await expect(page).toHaveURL(/\/milestones/);
  await expect(page.getByRole("dialog", { name })).toBeHidden();
});

test("업무 패널(?task=)이 열린 보드에서 다른 보드로 갔다가 돌아와도 숨은 보드가 패널을 열지 않는다", async ({
  page,
}) => {
  const title = `숨김 업무 ${unique()}`;
  const task = await api<{ id: string }>(
    "POST",
    "/api/v1/tasks",
    seed.member.tokens,
    {
      scope: "PROJECT",
      projectId: seed.project.id,
      title,
      type: "TASK",
      priority: "P2",
      status: "BACKLOG",
      assigneeIds: [seed.member.id],
    },
  );
  await signIn(page, seed.member.tokens);
  await page.goto("/me");
  await page.getByRole("link", { name: title }).first().click();
  const panel = page.getByRole("dialog", { name: "업무 상세" });
  await expect(panel).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`task=${task.id}`));
  // 패널 안 링크로 프로젝트 보드로 → 뒤로가기(내 보드 ?task= 로 복귀) → 패널 닫기
  await panel.getByRole("link", { name: /보드로 돌아가기$/ }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${seed.project.id}$`));
  await expectBoardUsable(page);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/me\\?task=${task.id}`));
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expectBoardUsable(page);
});
