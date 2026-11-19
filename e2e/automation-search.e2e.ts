import { expect, test, type Page } from "@playwright/test";
import { apiGet, apiUrl, readSeed, signIn, type Tokens } from "./support";

// 단계 8: 자동화 규칙(설정 > 자동화)과 ⌘K 통합 검색을 실제 API로 확인한다.
// SHOTS 디렉터리가 있으면 라이트·다크 × 1440·390 스크린샷을 남긴다(증거용).
const seed = readSeed();
const shots = process.env.E2E_SHOTS;
const title = `로그인 리다이렉트 수정 ${seed.run}`;
const personalTitle = `개인 메모 로그인 ${seed.run}`;

async function call<T>(
  path: string,
  tokens: Tokens,
  method: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${tokens.accessToken}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(
      `${method} ${path} → ${response.status} ${await response.text()}`,
    );
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function capture(page: Page, name: string, fullPage = false) {
  if (!shots) return;
  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    // 색 전환(120~200ms) 중간에 찍히지 않게 기다린다.
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${shots}/${name}-${theme}.png`, fullPage });
  }
}

type Rule = { id: string; name: string; enabled: boolean };
type RunPage = {
  items: { ruleName: string; status: string; resultCode: string | null }[];
};

test.describe.configure({ mode: "serial", timeout: 180_000 });

let taskId = "";
let bucketId = "";
let sprintId = "";
const sprintName = `로그인 개선 Sprint ${seed.run}`;
const settings = `/projects/${seed.project.id}/settings?tab=automation`;

test.beforeAll(async () => {
  const bucket = await call<{ id: string }>(
    `/api/v1/projects/${seed.project.id}/planning-buckets`,
    seed.admin,
    "POST",
    { name: `다음 주기 ${seed.run}` },
  );
  bucketId = bucket.id;
  const task = await call<{ id: string }>("/api/v1/tasks", seed.admin, "POST", {
    scope: "PROJECT",
    projectId: seed.project.id,
    title,
    assigneeIds: [seed.member.id],
    type: "DEV",
    priority: "P0",
    status: "IN_PROGRESS",
  });
  taskId = task.id;
  const sprint = await call<{ id: string }>(
    `/api/v1/projects/${seed.project.id}/sprints`,
    seed.admin,
    "POST",
    {
      name: sprintName,
      goal: null,
      startDate: "2026-11-23",
      endDate: "2026-12-04",
    },
  );
  sprintId = sprint.id;
  await call("/api/v1/tasks", seed.member.tokens, "POST", {
    scope: "PERSONAL",
    title: personalTitle,
    assigneeIds: [seed.member.id],
    type: "TASK",
    priority: "P2",
    status: "PLANNED",
  });
});

test("PM·헤드 어드민이 규칙을 만들고 끄고 켠다", async ({ page }) => {
  await signIn(page, seed.admin);
  await page.goto(settings);
  await expect(
    page.getByRole("heading", { name: "자동화 규칙" }),
  ).toBeVisible();
  await expect(page.getByText("규칙이 없습니다")).toBeVisible();
  await capture(page, "rules-empty-1440");

  await page.getByRole("button", { name: "규칙 추가" }).click();
  const dialog = page.getByRole("dialog", { name: "새 규칙" });
  // 금지 동작(상태 변경·PR merge → 완료·외부 저장소 쓰기)은 선택지에 없다.
  await expect(dialog.getByLabel("동작").locator("option")).toHaveText([
    "Discord로 알림",
    "확인 필요로 표시",
    "리뷰어 지정",
    "버킷으로 옮기기",
  ]);
  await dialog.getByLabel("이름").fill("P0 막힘이면 PM 호출");
  await dialog.getByLabel("언제").selectOption("TASK_BLOCKED");
  await dialog
    .getByRole("group", { name: "우선순위" })
    .getByRole("button", { name: "긴급" })
    .click();
  await dialog
    .getByRole("group", { name: "유형" })
    .getByRole("button", { name: "개발 업무" })
    .click();
  await dialog.getByLabel("PM", { exact: true }).check();
  await capture(page, "rule-editor-1440");
  await dialog.getByRole("button", { name: "규칙 만들기" }).click();
  await expect(dialog).toBeHidden();

  // 두 번째 규칙: 막히면 버킷 이동(성공 실행 기록용). 이름 중복은 서버 409 를 화면에 보여 준다.
  await page.getByRole("button", { name: "규칙 추가" }).click();
  const second = page.getByRole("dialog", { name: "새 규칙" });
  await second.getByLabel("이름").fill("P0 막힘이면 PM 호출");
  await second.getByLabel("언제").selectOption("TASK_BLOCKED");
  await second.getByLabel("동작").selectOption("MOVE_BUCKET");
  await second.getByRole("button", { name: "규칙 만들기" }).click();
  await expect(second.getByText("옮길 버킷을 고르세요.")).toBeVisible();
  await second.getByLabel("옮길 버킷").selectOption(bucketId);
  await second.getByRole("button", { name: "규칙 만들기" }).click();
  await expect(second.getByRole("alert")).toContainText("같은 이름의 규칙");
  await second.getByLabel("이름").fill("막히면 다음 주기로");
  await second.getByRole("button", { name: "규칙 만들기" }).click();
  await expect(second).toBeHidden();

  const rules = page.getByRole("list", { name: "자동화 규칙" });
  await expect(rules.locator(":scope > li")).toHaveCount(2);
  const toggle = page.getByRole("switch", { name: "P0 막힘이면 PM 호출 켜기" });
  await toggle.uncheck();
  await expect
    .poll(
      async () =>
        (
          await apiGet<Rule[]>(
            `/api/v1/projects/${seed.project.id}/rules`,
            seed.admin,
          )
        ).find((rule) => rule.name === "P0 막힘이면 PM 호출")?.enabled,
    )
    .toBe(false);
  await toggle.check();
  await expect
    .poll(
      async () =>
        (
          await apiGet<Rule[]>(
            `/api/v1/projects/${seed.project.id}/rules`,
            seed.admin,
          )
        ).find((rule) => rule.name === "P0 막힘이면 PM 호출")?.enabled,
    )
    .toBe(true);
});

test("업무가 막히면 실행 기록에 결과와 이유가 남는다", async ({ page }) => {
  test.setTimeout(120_000);
  await call(`/api/v1/tasks/${taskId}`, seed.admin, "PATCH", {
    blocked: true,
    blockedReason: "E2E 막힘",
  });
  // 워커 주기(15초) 안에 두 규칙 모두 끝난다.
  await expect
    .poll(
      async () =>
        (
          await apiGet<RunPage>(
            `/api/v1/projects/${seed.project.id}/rule-runs`,
            seed.admin,
          )
        ).items.filter((run) => !["PENDING", "SENDING"].includes(run.status))
          .length,
      { timeout: 90_000, intervals: [2_000] },
    )
    .toBe(2);
  await signIn(page, seed.admin);
  await page.goto(settings);
  const runs = page.getByRole("list", { name: "실행 기록 목록" });
  await expect(runs.getByRole("listitem")).toHaveCount(2);
  await expect(runs).toContainText(title);
  await expect(runs).toContainText("성공");
  for (const [name, width] of [
    ["rules-1440", 1440],
    ["rules-390", 390],
  ] as const) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page
      .getByRole("heading", { name: "자동화 규칙" })
      .scrollIntoViewIfNeeded();
    await capture(page, name);
    await page
      .getByRole("heading", { name: "실행 기록" })
      .scrollIntoViewIfNeeded();
    await capture(page, name.replace("rules", "runs"), width === 390);
  }
  await page.getByRole("button", { name: "P0 막힘이면 PM 호출 편집" }).click();
  await expect(page.getByRole("dialog", { name: "규칙 편집" })).toBeVisible();
  await capture(page, "rule-editor-390");
});

test("참여자는 자동화 탭을 보지 못한다", async ({ page }) => {
  await signIn(page, seed.member.tokens);
  await page.goto(settings);
  const tabs = page.getByRole("navigation", { name: "설정 영역" });
  await expect(tabs.getByRole("link", { name: "기본 정보" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(tabs.getByRole("link", { name: "자동화" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "자동화 규칙" })).toHaveCount(
    0,
  );
});

test("⌘K로 검색하고 키보드로 결과를 연다", async ({ page }) => {
  await signIn(page, seed.admin);
  await page.goto("/me");
  await expect(
    page.getByRole("button", { name: /검색/ }).first(),
  ).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog", { name: "검색" });
  await expect(palette).toBeVisible();
  await capture(page, "search-idle-1440");
  await palette.getByRole("combobox", { name: "검색어" }).fill(title);
  const results = palette.getByRole("listbox", { name: "검색 결과" });
  await expect(results.getByRole("group", { name: "업무" })).toBeVisible();
  await expect(results.getByRole("option").first()).toContainText(title);
  await capture(page, "search-results-1440");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/tasks/${taskId}$`));
  await expect(palette).toBeHidden();

  // 모바일: 상단 검색 버튼으로 연다.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await palette
    .getByRole("combobox", { name: "검색어" })
    .fill(`수정 ${seed.run}`);
  await expect(results.getByRole("option").first()).toBeVisible();
  await capture(page, "search-results-390");
});

test("Sprint 결과는 Sprint 상세로 연다", async ({ page }) => {
  await signIn(page, seed.admin);
  await page.goto("/me");
  await expect(
    page.getByRole("button", { name: /검색/ }).first(),
  ).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog", { name: "검색" });
  await palette.getByRole("combobox", { name: "검색어" }).fill(sprintName);
  const group = palette.getByRole("group", { name: "Sprint" });
  await expect(group.getByRole("option").first()).toContainText(sprintName);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    new RegExp(`/projects/${seed.project.id}/sprints/${sprintId}$`),
  );
  // Sprint 상세: 제목선은 프로젝트 이름, Sprint 이름은 그 아래 머리글.
  await expect(page.getByText(sprintName, { exact: true })).toBeVisible();
});

test("남의 개인 업무와 참여하지 않은 프로젝트 업무는 검색되지 않는다", async ({
  page,
}) => {
  await signIn(page, seed.admin);
  await page.goto("/me");
  await expect(
    page.getByRole("button", { name: /검색/ }).first(),
  ).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog", { name: "검색" });
  await palette.getByRole("combobox", { name: "검색어" }).fill(personalTitle);
  await expect(palette.getByText("검색 결과가 없습니다")).toBeVisible();
  await capture(page, "search-empty-1440");

  type Search = { groups: { type: string; items: { title: string }[] }[] };
  const q = encodeURIComponent(personalTitle);
  const mine = await apiGet<Search>(
    `/api/v1/search?q=${q}`,
    seed.member.tokens,
  );
  expect(
    mine.groups.flatMap((group) => group.items).map((item) => item.title),
  ).toContain(personalTitle);
  const outsider = await apiGet<Search>(
    `/api/v1/search?q=${encodeURIComponent(title)}`,
    seed.outsider.tokens,
  );
  expect(outsider.groups.flatMap((group) => group.items)).toHaveLength(0);
});

test("전체 결과 화면과 검색 실패 상태", async ({ page }) => {
  await signIn(page, seed.admin);
  await page.goto(`/search?q=${encodeURIComponent(`수정 ${seed.run}`)}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "검색" }),
  ).toBeVisible();
  const types = page.getByRole("navigation", { name: "결과 유형" });
  await expect(types.getByRole("link", { name: "업무" })).toBeVisible();
  // 단계 7 merge 전: 문서·사고 필터는 안내 없이 없다.
  await expect(types.getByRole("link", { name: "문서" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: new RegExp(title) }),
  ).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await capture(page, `search-page-${width}`);
  }
  // 실패 상태: 네트워크 차단으로 재현(가짜 응답 아님).
  await page.route("**/api/v1/search**", (route) => route.abort());
  await page.goto(`/search?q=${encodeURIComponent(`없는검색어${seed.run}`)}`);
  await expect(
    page.getByRole("alert").filter({ hasText: "검색하지 못했습니다" }),
  ).toContainText("서버에 연결할 수 없습니다");
  await capture(page, "search-error-390");
});

test("'확인 필요로 표시' 규칙이 담당자 홈의 확인 필요에 규칙 이름과 함께 나온다", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const name = `리뷰 진입 시 확인 ${seed.run}`;
  await call(`/api/v1/projects/${seed.project.id}/rules`, seed.admin, "POST", {
    name,
    enabled: true,
    event: "TASK_STATUS_CHANGED",
    eventStatus: "REVIEW",
    conditions: [],
    action: "MARK_ATTENTION",
  });
  await call(`/api/v1/tasks/${taskId}/position`, seed.admin, "PATCH", {
    status: "REVIEW",
    prevId: null,
    nextId: null,
  });
  await expect
    .poll(
      async () =>
        (
          await apiGet<RunPage>(
            `/api/v1/projects/${seed.project.id}/rule-runs?status=SUCCEEDED`,
            seed.admin,
          )
        ).items.some((run) => run.ruleName === name),
      { timeout: 90_000, intervals: [2_000] },
    )
    .toBe(true);
  await signIn(page, seed.member.tokens);
  await page.goto("/");
  const group = page
    .locator(".home-group")
    .filter({ hasText: "자동화 규칙이 표시함" });
  await expect(group).toContainText(name);
  await expect(group).toContainText(title);
  await group.scrollIntoViewIfNeeded();
  await capture(page, "home-rule-marked-1440");
});
