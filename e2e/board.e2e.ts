import { expect, test, type Locator, type Page } from "@playwright/test";
import { apiGet, readSeed, signIn } from "./support";

// 계획 F1 시나리오: 토큰 주입 → 내 보드 → 프로젝트 보드 → 업무 생성(시작 상태) → 드래그 이동
// → 상세 편집 → 막힘 → 완료 → 팀 공용 보드 → 권한 없는 사용자. 모두 격리 backend 실제 API 호출이다.
test.describe.configure({ mode: "serial" });

type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  blocked: boolean;
  blockedReason: string | null;
};

const seed = readSeed();
const title = `E2E 업무 ${seed.run}`;
const edited = `${title} 수정`;
let taskId = "";

const column = (page: Page, status: string) =>
  page.locator(`section.board-column[data-status="${status}"]`);
const card = (page: Page | Locator, text: string) =>
  page.locator("article.board-card", { hasText: text });

test("토큰을 주입하면 내 보드로 들어간다", async ({ page }) => {
  await signIn(page, seed.member.tokens);
  await page.goto("/");
  await expect(page).toHaveURL(/\/me$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "내 보드" }),
  ).toBeVisible();
  await expect(page.getByText(seed.member.name).first()).toBeVisible();
});

test("사이드바에서 프로젝트 보드로 이동해 시작 상태를 지정해 업무를 만든다", async ({
  page,
}) => {
  await signIn(page, seed.member.tokens);
  await page.goto("/me");
  await page
    .getByRole("navigation", { name: "프로젝트 바로가기" })
    .getByRole("link", { name: seed.project.name })
    .click();
  await expect(page).toHaveURL(new RegExp(`/projects/${seed.project.id}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: seed.project.name }),
  ).toBeVisible();

  await page.getByRole("button", { name: "업무 등록" }).click();
  const dialog = page.getByRole("dialog", { name: "업무 등록" });
  await dialog.getByLabel("제목 (필수)").fill(title);
  await dialog.getByLabel("시작 상태").selectOption({ label: "진행 예정" });
  await dialog.getByRole("button", { name: "업무 등록" }).click();
  await expect(dialog).toBeHidden();
  await expect(card(column(page, "PLANNED"), title)).toBeVisible();

  const href = await card(page, title)
    .getByRole("link", { name: title })
    .getAttribute("href");
  taskId = decodeURIComponent(href?.split("/tasks/")[1] ?? "");
  expect(taskId).not.toBe("");
  expect(
    (await apiGet<TaskDetail>(`/api/v1/tasks/${taskId}`, seed.member.tokens))
      .status,
  ).toBe("PLANNED");
});

test("카드를 끌어 진행 중으로 옮긴다", async ({ page }) => {
  await signIn(page, seed.member.tokens);
  await page.goto(`/projects/${seed.project.id}`);
  const target = column(page, "IN_PROGRESS");
  await card(column(page, "PLANNED"), title).dragTo(target);
  await expect(
    page.getByRole("status").filter({ hasText: "업무를 이동했습니다." }),
  ).toBeVisible();
  await expect(card(target, title)).toBeVisible();
  expect(
    (await apiGet<TaskDetail>(`/api/v1/tasks/${taskId}`, seed.member.tokens))
      .status,
  ).toBe("IN_PROGRESS");
});

test("상세에서 제목·설명을 고치고 막힘을 표시한 뒤 완료한다", async ({
  page,
}) => {
  await signIn(page, seed.member.tokens);
  await page.goto(`/projects/${seed.project.id}`);
  await card(page, title).getByRole("link", { name: title }).click();
  const panel = page.getByRole("dialog", { name: "업무 상세" });
  await expect(
    panel.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible();

  await panel.getByRole("button", { name: "수정" }).click();
  let editor = page.getByRole("dialog", { name: "업무 수정" });
  await editor.getByLabel("제목 (필수)").fill(edited);
  await editor
    .getByRole("textbox", { name: "설명" })
    .fill("E2E 에서 고친 설명");
  await editor.getByRole("button", { name: "변경 저장" }).click();
  await expect(editor).toBeHidden();
  await expect(
    panel.getByRole("heading", { level: 1, name: edited }),
  ).toBeVisible();
  await expect(panel.getByText("E2E 에서 고친 설명")).toBeVisible();

  await panel.getByRole("button", { name: "수정" }).click();
  editor = page.getByRole("dialog", { name: "업무 수정" });
  await editor.getByRole("checkbox", { name: "막힘" }).check();
  await editor.getByLabel("막힌 사유 (필수)").fill("서버 응답 대기");
  await editor.getByRole("button", { name: "변경 저장" }).click();
  await expect(editor).toBeHidden();
  await expect(panel.getByText("서버 응답 대기")).toBeVisible();
  const blocked = await apiGet<TaskDetail>(
    `/api/v1/tasks/${taskId}`,
    seed.member.tokens,
  );
  expect([blocked.title, blocked.blocked, blocked.blockedReason]).toEqual([
    edited,
    true,
    "서버 응답 대기",
  ]);

  await panel.getByLabel("상태 변경").selectOption({ label: "완료" });
  await expect(panel.getByText("상태를 변경했습니다.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(card(column(page, "DONE"), edited)).toBeVisible();
  expect(
    (await apiGet<TaskDetail>(`/api/v1/tasks/${taskId}`, seed.member.tokens))
      .status,
  ).toBe("DONE");
});

test("팀 공용 보드에 업무를 만든다", async ({ page }) => {
  await signIn(page, seed.member.tokens);
  await page.goto("/me");
  await page
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "팀 공용" })
    .click();
  await expect(page).toHaveURL(/\/team$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "팀 공용 보드" }),
  ).toBeVisible();
  const teamTitle = `E2E 팀 업무 ${seed.run}`;
  await page.getByRole("button", { name: "업무 등록" }).click();
  const dialog = page.getByRole("dialog", { name: "업무 등록" });
  await dialog.getByLabel("제목 (필수)").fill(teamTitle);
  await dialog.getByRole("button", { name: "업무 등록" }).click();
  await expect(dialog).toBeHidden();
  await expect(card(column(page, "BACKLOG"), teamTitle)).toBeVisible();
});

test("참여하지 않은 사용자는 비공개 프로젝트와 관리자 화면을 볼 수 없다", async ({
  page,
}) => {
  await signIn(page, seed.outsider.tokens);
  await page.goto("/me");
  await expect(
    page.getByRole("heading", { level: 1, name: "내 보드" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "프로젝트 바로가기" })
      .getByRole("link", {
        name: seed.project.name,
      }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "주 메뉴" })
      .getByRole("link", { name: "관리자" }),
  ).toHaveCount(0);

  await page.goto(`/projects/${seed.project.id}`);
  await expect(
    page.getByText("프로젝트를 찾을 수 없거나 접근할 수 없습니다"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "업무 등록" })).toHaveCount(0);

  await page.goto(`/tasks/${taskId}`);
  await expect(
    page.getByText("업무를 찾을 수 없거나 접근할 수 없습니다"),
  ).toBeVisible();

  await page.goto("/admin");
  await expect(page.getByText("관리자 권한이 필요합니다")).toBeVisible();
});
