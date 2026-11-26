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
const sprintName = `로그인 개선 스프린트 ${seed.run}`;
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
  await expect(page.getByText("규칙이 없어요")).toBeVisible();
  await capture(page, "rules-empty-1440");

  await page.getByRole("button", { name: "규칙 추가" }).click();
  const dialog = page.getByRole("dialog", { name: "새 규칙" });
  // 업무 이벤트는 장애 동작을 빼고 모두 고른다. GitHub·캘린더에 직접 쓰는 동작은 없다(s23 4.2).
  await expect(dialog.getByLabel("동작").locator("option")).toHaveText([
    "Discord로 알림",
    "확인 필요로 표시",
    "리뷰어 지정",
    "버킷으로 옮기기",
    "담당자 지정",
    "우선순위 변경",
    "업무 만들기",
    "상태 바꾸기",
    "스프린트에 넣기",
    "마감일 정하기",
    "댓글 남기기",
    "연결 업무 만들기",
    "Discord DM 보내기",
    "웹훅 보내기",
    "에이전트에게 맡기기",
    "에스컬레이션",
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

test("스프린트 결과는 스프린트 상세로 연다", async ({ page }) => {
  await signIn(page, seed.admin);
  await page.goto("/me");
  await expect(
    page.getByRole("button", { name: /검색/ }).first(),
  ).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog", { name: "검색" });
  await palette.getByRole("combobox", { name: "검색어" }).fill(sprintName);
  const group = palette.getByRole("group", { name: "스프린트" });
  await expect(group.getByRole("option").first()).toContainText(sprintName);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    new RegExp(`/projects/${seed.project.id}/sprints/${sprintId}$`),
  );
  // Sprint 상세: 제목선은 프로젝트 이름, Sprint 이름은 그 아래 머리글.
  await expect(page.getByText(sprintName, { exact: true })).toBeVisible();
});

test("문서·사고를 검색하고 키보드·유형 필터로 연다", async ({ page }) => {
  const query = `${seed.run} 게이트웨이`;
  const service = await call<{ id: string }>(
    "/api/v1/services",
    seed.admin,
    "POST",
    {
      key: `t8f-gw-${seed.run}`,
      name: `T8F 게이트웨이 서비스 ${seed.run}`,
      primaryOwnerId: seed.member.id,
    },
  );
  const incident = await call<{ id: string }>(
    "/api/v1/incidents",
    seed.admin,
    "POST",
    { title: `${query} 장애`, severity: "SEV2", serviceIds: [service.id] },
  );
  const doc = await call<{ id: string }>(
    "/api/v1/knowledge",
    seed.admin,
    "POST",
    {
      kind: "RUNBOOK",
      title: `${query} 복구 절차`,
      body: "재시작 순서",
      serviceIds: [service.id],
    },
  );

  await signIn(page, seed.admin);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /검색/ }).first(),
  ).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog", { name: "검색" });
  await palette.getByRole("combobox", { name: "검색어" }).fill(query);
  const results = palette.getByRole("listbox", { name: "검색 결과" });
  // 묶음 순서: 업무 → 문서 → 사고 → 서비스 → Sprint(서버 순서).
  await expect(results.getByRole("group", { name: "문서" })).toContainText(
    `${query} 복구 절차`,
  );
  await expect(results.getByRole("group", { name: "사고" })).toContainText(
    "SEV2",
  );
  await capture(page, "search-docs-incidents-1440");
  // 첫 항목(문서) → 아래 화살표 한 번 = 사고.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/incidents/${incident.id}$`));

  await page.goto(`/search?q=${encodeURIComponent(query)}&type=DOCUMENT`);
  await expect(
    page.getByRole("navigation", { name: "결과 유형" }).getByRole("link", {
      name: "문서",
    }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: /사고/ })).toHaveCount(0);
  await page
    .getByRole("link", { name: new RegExp(`${query} 복구 절차`) })
    .click();
  await expect(page).toHaveURL(new RegExp(`/docs/${doc.id}$`));
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
  await expect(palette.getByText("검색 결과가 없어요")).toBeVisible();
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
  // 단계 7 뒤 서버가 문서·사고 원천을 갖고 있어 필터에 나온다(unavailableTypes=[]).
  await expect(types.getByRole("link", { name: "문서" })).toBeVisible();
  await expect(types.getByRole("link", { name: "사고" })).toBeVisible();
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
    page.getByRole("alert").filter({ hasText: "검색하지 못했어요" }),
  ).toContainText("서버에 연결할 수 없어요");
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

// 사고 → 프로젝트 경로(계약 D8-h): 사고의 영향 서비스 → 서비스 저장소 → 프로젝트 저장소.
// 저장소 연결에 GitHub App이 필요해 GitHub 스텁(공식 응답 형식, 실제 GitHub 아님)을 띄운 스택에서만 돈다.
const githubInstallationId = Number(process.env.E2E_GITHUB_INSTALLATION_ID);
const githubRepositoryId = Number(process.env.E2E_GITHUB_REPOSITORY_ID);
test("사고가 생기면 '사고가 생길 때' 규칙이 실행 기록에 남는다", async ({
  page,
}) => {
  test.skip(
    !githubInstallationId || !githubRepositoryId,
    "E2E_GITHUB_INSTALLATION_ID·E2E_GITHUB_REPOSITORY_ID(GitHub 스텁) 필요",
  );
  test.setTimeout(120_000);
  const repository = {
    installationId: githubInstallationId,
    repositoryId: githubRepositoryId,
  };
  await call(
    `/api/v1/projects/${seed.project.id}/github/repositories`,
    seed.admin,
    "POST",
    { ...repository, isDefault: false },
  );
  const service = await call<{ id: string }>(
    "/api/v1/services",
    seed.admin,
    "POST",
    {
      key: `t8f-inc-${seed.run}`,
      name: `T8F 사고 서비스 ${seed.run}`,
      primaryOwnerId: seed.member.id,
    },
  );
  await call(
    `/api/v1/services/${service.id}/repositories`,
    seed.admin,
    "POST",
    repository,
  );

  // 규칙은 화면에서 만든다: 사고 이벤트는 조건이 없고 동작은 Discord 알림(PM 멘션)만.
  const name = `사고 나면 PM 호출 ${seed.run}`;
  await signIn(page, seed.admin);
  await page.goto(settings);
  await page.getByRole("button", { name: "규칙 추가" }).click();
  const dialog = page.getByRole("dialog", { name: "새 규칙" });
  await dialog.getByLabel("이름").fill(name);
  await dialog.getByLabel("언제").selectOption("INCIDENT_CREATED");
  await expect(dialog.getByRole("group", { name: "우선순위" })).toHaveCount(0);
  await expect(dialog.getByLabel("언제")).toHaveAccessibleDescription(
    /영향 서비스가 이 프로젝트에 연결된 저장소/,
  );
  await expect(dialog.getByLabel("동작").locator("option")).toHaveText([
    "Discord로 알림",
  ]);
  await expect(dialog.getByLabel("담당자", { exact: true })).toHaveCount(0);
  await dialog.getByLabel("PM", { exact: true }).check();
  await capture(page, "rule-editor-incident-1440");
  await dialog.getByRole("button", { name: "규칙 만들기" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("list", { name: "자동화 규칙" }).locator(":scope > li", {
      hasText: name,
    }),
  ).toContainText("사고가 생길 때, Discord로 알림, PM 멘션");

  const incident = await call<{ id: string }>(
    "/api/v1/incidents",
    seed.admin,
    "POST",
    {
      title: `E2E 사고 ${seed.run}`,
      severity: "SEV1",
      serviceIds: [service.id],
    },
  );
  type IncidentRuns = {
    items: { ruleName: string; status: string; incidentId: string | null }[];
  };
  // Discord 봇이 없는 스택이라 결과는 건너뜀(DISCORD_NOT_CONFIGURED). 핵심은 사고 → 규칙 실행이 남는 것.
  await expect
    .poll(
      async () =>
        (
          await apiGet<IncidentRuns>(
            `/api/v1/projects/${seed.project.id}/rule-runs`,
            seed.admin,
          )
        ).items.find(
          (run) =>
            run.ruleName === name &&
            run.incidentId === incident.id &&
            !["PENDING", "SENDING"].includes(run.status),
        )?.status,
      { timeout: 90_000, intervals: [2_000] },
    )
    .toBeTruthy();
  await page.reload();
  const runs = page.getByRole("list", { name: "실행 기록 목록" });
  const row = runs.getByRole("listitem").filter({ hasText: name });
  await expect(row).toContainText("사고가 생길 때");
  await row.scrollIntoViewIfNeeded();
  await capture(page, "runs-incident-1440");
  await row.getByRole("link", { name: "사고 보기" }).click();
  await expect(page).toHaveURL(new RegExp(`/incidents/${incident.id}$`));
});
