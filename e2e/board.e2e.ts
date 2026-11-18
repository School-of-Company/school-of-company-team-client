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

test("10초 폴링과 탭 재조회 동안 카드가 사라지거나 스켈레톤으로 바뀌지 않는다", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await signIn(page, seed.member.tokens);
  await page.goto(`/projects/${seed.project.id}`);
  await expect(card(page, edited)).toBeVisible();
  await page.evaluate(() => {
    const w = window as unknown as { flicker: string[] };
    w.flicker = [];
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.removedNodes)
          if (
            node instanceof Element &&
            (node.matches("article.board-card") ||
              node.querySelector("article.board-card"))
          )
            w.flicker.push("card removed");
        for (const node of record.addedNodes)
          if (
            node instanceof Element &&
            node.querySelector('[aria-label="보드를 불러오는 중"]')
          )
            w.flicker.push("skeleton shown");
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  const boardRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/board"))
      boardRequests.push(request.url());
  });
  // 두 번의 폴링 주기 + 탭 전환 후 복귀(visibilitychange·focus 재조회).
  await page.waitForTimeout(21_000);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
  await page.waitForTimeout(2_000);
  expect(boardRequests.length).toBeGreaterThanOrEqual(2);
  expect(
    await page.evaluate(
      () => (window as unknown as { flicker: string[] }).flicker,
    ),
  ).toEqual([]);
  await expect(card(page, edited)).toBeVisible();
});

test("모바일 메뉴는 키보드로 열고 닫히며 포커스가 메뉴 버튼으로 돌아온다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, seed.member.tokens);
  await page.goto("/me");
  const trigger = page.getByRole("button", { name: "메뉴 열기" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const drawer = page.getByRole("dialog", { name: "School of Company" });
  await expect(drawer).toBeVisible();
  await expect(
    drawer.getByRole("link", { name: seed.project.name }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await drawer.getByRole("link", { name: "팀 공용" }).click();
  await expect(page).toHaveURL(/\/team$/);
  await expect(drawer).toBeHidden();
});

test("드래그 없이 키보드만으로 카드 메뉴를 열어 상태를 바꿀 수 있다", async ({
  page,
}) => {
  await signIn(page, seed.member.tokens);
  await page.goto(`/projects/${seed.project.id}`);
  const menuButton = page.getByRole("button", { name: `${edited} 더보기` });
  await menuButton.focus();
  await page.keyboard.press("ArrowDown");
  const menu = page.getByRole("menu", { name: `${edited} 작업` });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(menuButton).toBeFocused();
  await menuButton.press("Enter");
  await menu
    .getByRole("menuitem", { name: "상태 변경: 진행 중" })
    .press("Enter");
  await expect(card(column(page, "IN_PROGRESS"), edited)).toBeVisible();
  expect(
    (await apiGet<TaskDetail>(`/api/v1/tasks/${taskId}`, seed.member.tokens))
      .status,
  ).toBe("IN_PROGRESS");
});

test("빈 보드 안내는 필터 유무에 따라 다르고, legacy 계정은 Discord 를 요구받지 않는다", async ({
  page,
}) => {
  await signIn(page, seed.outsider.tokens);
  await page.goto("/me");
  await expect(
    page.getByRole("heading", { name: "업무가 없습니다" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "필터 초기화" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "업무 추가" })).toBeVisible();

  await page.goto("/me?priority=P0");
  await expect(
    page.getByRole("heading", { name: "조건에 맞는 업무가 없습니다" }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("button", { name: "필터 초기화" })
    .click();
  await expect(page).toHaveURL(/\/me$/);
  await expect(
    page.getByRole("heading", { name: "업무가 없습니다" }),
  ).toBeVisible();

  await page.goto("/account");
  const discord = page.getByRole("region", { name: "Discord 계정" });
  await expect(discord.getByText("연결 안 됨")).toBeVisible();
  await expect(discord.getByText("연결 필요")).toHaveCount(0);
});
