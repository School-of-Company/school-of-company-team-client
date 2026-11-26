import { expect, test, type Page } from "@playwright/test";
import { apiGet, apiUrl, readSeed, signIn, type Tokens } from "./support";

// 화이트보드(서버 docs/spec/s10-whiteboard.md): 실제 API로 만들기·그리기·자동 저장·동시 편집 병합·커서·댓글·이력 되돌리기·권한·검색을 확인한다.
const seed = readSeed();
const title = `E2E 회의 ${seed.run}`;
let boardId = "";

type Element = { id: string; type: string; isDeleted?: boolean };
type Detail = {
  version: number;
  scene: { elements: Element[] };
};
const live = (detail: Detail) =>
  detail.scene.elements.filter((element) => !element.isDeleted);

test.describe.configure({ mode: "serial" });

async function drawRectangle(page: Page, at: { x: number; y: number }) {
  const canvas = page.locator(".excalidraw canvas.interactive");
  const box = (await canvas.boundingBox())!;
  await page.getByTitle("사각형 — R 또는 2").click();
  await page.mouse.move(box.x + at.x, box.y + at.y);
  await page.mouse.down();
  await page.mouse.move(box.x + at.x + 120, box.y + at.y + 80, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.press("Escape");
}

async function saved(page: Page) {
  await expect(page.getByText("저장 대기")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("저장됨")).toBeVisible({ timeout: 10_000 });
}

async function apiPut(path: string, tokens: Tokens, body: unknown) {
  return fetch(`${apiUrl}${path}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${tokens.accessToken}`,
    },
    body: JSON.stringify(body),
  });
}

test("팀원이 템플릿으로 팀 공용 보드를 만들고 그린 것이 자동 저장된다", async ({
  page,
}) => {
  await signIn(page, seed.member.tokens);
  await page.goto("/me");
  await page.getByRole("link", { name: "화이트보드" }).first().click();
  await expect(page).toHaveURL(/\/whiteboards$/);
  await page.getByRole("button", { name: "새 화이트보드" }).click();
  const dialog = page.getByRole("dialog", { name: "새 화이트보드" });
  await dialog.getByRole("button", { name: "만들기" }).click();
  await expect(dialog.getByText("제목을 입력하세요.")).toBeVisible();
  await dialog.getByLabel("제목").fill(title);
  await dialog.getByRole("radio", { name: /회의/ }).check();
  await dialog.getByRole("button", { name: "만들기" }).click();
  await expect(page).toHaveURL(/\/whiteboards\/[0-9A-Z]{26}$/);
  boardId = page.url().split("/").pop() ?? "";
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.locator(".excalidraw canvas.interactive")).toBeVisible();
  // 템플릿 글자는 처음 열 때 Excalidraw 가 크기를 다시 재서 한 번 저장된다. 그 저장이 끝난 뒤를 기준으로 본다.
  await page.waitForTimeout(3_500);
  await expect(page.getByText("저장됨")).toBeVisible({ timeout: 10_000 });

  const before = await apiGet<Detail>(
    `/api/v1/whiteboards/${boardId}`,
    seed.member.tokens,
  );
  expect(live(before).length).toBeGreaterThan(0);
  await drawRectangle(page, { x: 480, y: 400 });
  await saved(page);
  const after = await apiGet<Detail>(
    `/api/v1/whiteboards/${boardId}`,
    seed.member.tokens,
  );
  expect(after.version).toBe(before.version + 1);
  expect(live(after).length).toBe(live(before).length + 1);
});

test("두 사람이 함께 열면 커서가 보이고, 다른 사람의 저장이 병합된다", async ({
  browser,
}) => {
  const member = await browser.newPage();
  const admin = await browser.newPage();
  await signIn(member, seed.member.tokens);
  await signIn(admin, seed.admin);
  await member.goto(`/whiteboards/${boardId}`);
  await admin.goto(`/whiteboards/${boardId}`);
  await expect(admin.locator(".excalidraw canvas.interactive")).toBeVisible();

  // 커서: admin 의 presence 응답에 member 가 들어온다.
  const cursor = await admin.waitForResponse(
    async (response) =>
      response.url().endsWith(`/whiteboards/${boardId}/presence`) &&
      (
        (await response.json()) as { cursors: { user: { id: string } }[] }
      ).cursors.some((item) => item.user.id === seed.member.id),
    { timeout: 10_000 },
  );
  expect(cursor.ok()).toBe(true);

  // 다른 사람의 저장(여기서는 API 로 낸 저장)을 화면이 받아 병합하고, 내 그림과 함께 남긴다.
  const current = await apiGet<Detail>(
    `/api/v1/whiteboards/${boardId}`,
    seed.admin,
  );
  const remote = {
    ...current.scene.elements[0],
    id: `remote-${seed.run}`,
    x: 900,
    y: 900,
    version: 1,
    versionNonce: 1,
    isDeleted: false,
  };
  const put = await apiPut(`/api/v1/whiteboards/${boardId}/scene`, seed.admin, {
    baseVersion: current.version,
    scene: { elements: [...current.scene.elements, remote], appState: {} },
  });
  expect(put.status).toBe(200);
  await member.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().endsWith(`/api/v1/whiteboards/${boardId}`),
    { timeout: 10_000 },
  );
  await drawRectangle(member, { x: 820, y: 420 });
  await saved(member);
  const merged = await apiGet<Detail>(
    `/api/v1/whiteboards/${boardId}`,
    seed.member.tokens,
  );
  expect(live(merged).some((element) => element.id === remote.id)).toBe(true);
  expect(live(merged).length).toBe(live(current).length + 2);
  await member.close();
  await admin.close();
});

test("댓글을 달고 해결하며, 이력으로 처음 템플릿 상태로 되돌린다", async ({
  page,
}) => {
  await signIn(page, seed.member.tokens);
  await page.goto(`/whiteboards/${boardId}`);
  await page.getByRole("button", { name: "댓글" }).click();
  const panel = page.getByRole("complementary", { name: "댓글" });
  await panel.getByRole("textbox", { name: "댓글" }).fill("안건 순서 바꾸기");
  await panel.getByRole("button", { name: "댓글 달기" }).click();
  await expect(panel.getByText("안건 순서 바꾸기")).toBeVisible();
  await panel.getByRole("button", { name: "해결" }).click();
  await expect(
    panel.getByRole("button", { name: "해결된 댓글 1개 보기" }),
  ).toBeVisible();

  const first = await apiGet<{ id: string; version: number }[]>(
    `/api/v1/whiteboards/${boardId}/revisions`,
    seed.member.tokens,
  );
  const v1 = first.find((revision) => revision.version === 1)!;
  const template = await apiGet<{ scene: { elements: Element[] } }>(
    `/api/v1/whiteboards/${boardId}/revisions/${v1.id}`,
    seed.member.tokens,
  );
  await page.getByRole("button", { name: "변경 이력" }).click();
  const dialog = page.getByRole("dialog", { name: "변경 이력" });
  await dialog
    .getByRole("listitem")
    .filter({ hasText: "v1" })
    .getByRole("button", { name: "되돌리기" })
    .click();
  await expect(page.getByText("이 이력으로 되돌렸어요.")).toBeVisible();
  await expect(page.getByText("저장됨")).toBeVisible({ timeout: 10_000 });
  const restored = await apiGet<Detail>(
    `/api/v1/whiteboards/${boardId}`,
    seed.member.tokens,
  );
  expect(
    live(restored)
      .map((element) => element.id)
      .sort(),
  ).toEqual(template.scene.elements.map((element) => element.id).sort());
});

test("비공개 프로젝트 보드는 비참여자에게 없는 것처럼 보이고, 검색에도 나오지 않는다", async ({
  page,
}) => {
  await signIn(page, seed.member.tokens);
  await page.goto(`/projects/${seed.project.id}/whiteboards`);
  await page.getByRole("button", { name: "새 화이트보드" }).click();
  const dialog = page.getByRole("dialog", { name: "새 화이트보드" });
  const secret = `E2E 비공개 흐름도 ${seed.run}`;
  await dialog.getByLabel("제목").fill(secret);
  await dialog.getByRole("radio", { name: /흐름도/ }).check();
  await dialog.getByRole("button", { name: "만들기" }).click();
  await expect(page).toHaveURL(/\/whiteboards\/[0-9A-Z]{26}$/);
  const secretId = page.url().split("/").pop() ?? "";
  await expect(
    page.getByRole("link", { name: "화이트보드" }).last(),
  ).toBeVisible();

  // 팀원 검색에는 둘 다 나온다.
  await page.goto(`/search?q=${encodeURIComponent(seed.run)}`);
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  await expect(page.getByRole("link", { name: secret })).toBeVisible();

  const outsider = await page.context().browser()!.newPage();
  await signIn(outsider, seed.outsider.tokens);
  await outsider.goto(`/whiteboards/${secretId}`);
  await expect(
    outsider.getByText("화이트보드가 없거나 볼 권한이 없어요."),
  ).toBeVisible();
  await outsider.goto(`/search?q=${encodeURIComponent(seed.run)}`);
  await expect(outsider.getByRole("link", { name: title })).toBeVisible();
  await expect(outsider.getByRole("link", { name: secret })).toHaveCount(0);
  await outsider.close();
});

test("만든 사람이 보드를 지우면 목록에서 사라진다", async ({ page }) => {
  await signIn(page, seed.member.tokens);
  await page.goto(`/whiteboards/${boardId}`);
  await page.getByRole("button", { name: "지우기" }).click();
  const dialog = page.getByRole("dialog", { name: "화이트보드 지우기" });
  await dialog.getByRole("button", { name: "지우기" }).click();
  await expect(page).toHaveURL(/\/whiteboards$/);
  await expect(page.getByRole("link", { name: title })).toHaveCount(0);
});
