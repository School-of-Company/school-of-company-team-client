import type { Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import {
  insertOAuthRows,
  memberGithubId,
  repository,
  sendWebhook,
  startGithubStub,
  type StubState,
} from "./github-stub";
import { apiGet, apiUrl, readSeed, signIn, type Tokens } from "./support";

// 저장소가 비공개로 바뀌면 저장소 목록류(업무 상세 발행 저장소, 설정 연결·설치 저장소)에 이름이 남지 않는지.
// 실제 API + 로컬 GitHub 스텁·서명 웹훅(실제 GitHub 아님). 서버는 M2(#47) 이후 main 이어야 한다.
// E2E_GITHUB_STUB_PORT·E2E_GITHUB_WEBHOOK_SECRET·E2E_PG_CONTAINER 가 없으면 건너뛴다.
const stubPort = Number(process.env.E2E_GITHUB_STUB_PORT) || 0;
test.skip(!stubPort, "GitHub 스텁 변수가 없으면 저장소를 연결할 수 없다");
test.describe.configure({ mode: "serial" });

const seed = readSeed();
const taskTitle = "저장소 캐시 점검 업무";
let taskId = "";
let stub: Server | undefined;
let state: StubState;

async function call<T>(
  method: string,
  path: string,
  tokens: Tokens,
  body?: unknown,
) {
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

const memberLogin = () => `member-${seed.run}`;

test.beforeAll(async () => {
  const githubId = memberGithubId(seed.run);
  state = {
    installationId: 77,
    repo: { id: githubId + 2, fullName: `acme/secret-${seed.run}` },
    logins: { [githubId]: memberLogin(), 1999999: "admin-gh" },
    permissions: {},
    pulls: {},
    suites: [],
  };
  stub = await startGithubStub(state, stubPort);
  const admin = await apiGet<{ id: string }>("/api/v1/me", seed.admin);
  insertOAuthRows(process.env.E2E_PG_CONTAINER!, [
    { userId: seed.member.id, githubId, login: memberLogin() },
    { userId: admin.id, githubId: 1_999_999, login: "admin-gh" },
  ]);
  await call(
    "POST",
    `/api/v1/projects/${seed.project.id}/github/repositories`,
    seed.admin,
    { installationId: state.installationId, repositoryId: state.repo.id },
  );
  const task = await call<{ id: string }>(
    "POST",
    "/api/v1/tasks",
    seed.member.tokens,
    {
      scope: "PROJECT",
      projectId: seed.project.id,
      assigneeIds: [seed.member.id],
      title: taskTitle,
      type: "TASK",
      priority: "P2",
      status: "PLANNED",
    },
  );
  taskId = task.id;
});

test.afterAll(() => {
  stub?.close();
});

/** 탭을 숨겼다 다시 보이게 한다(TanStack 포커스 재조회). */
const refocus = (page: Page) =>
  page.evaluate(() => {
    for (const value of ["hidden", "visible"]) {
      Object.defineProperty(document, "visibilityState", {
        value,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
      // TanStack focusManager 는 window 에서 듣는다.
      window.dispatchEvent(new Event("visibilitychange"));
    }
  });

const select = (page: Page) => page.getByLabel("Issue 발행 저장소");
const options = (page: Page) =>
  select(page).locator("option").allTextContents();

/** 팀원에게 보이는 프로젝트 저장소 이름(서버 원본 권한 캐시 최대 60초를 기다린다). */
const memberSees = async () =>
  (
    await apiGet<{ fullName: string }[]>(
      `/api/v1/projects/${seed.project.id}/github/repositories`,
      seed.member.tokens,
    )
  ).some((repo) => repo.fullName === state.repo.fullName);

/** 비공개 전환(서명 웹훅) 또는 공개 복귀. 팀원 원본 권한도 함께 바꾼다. */
async function setPrivate(value: boolean) {
  state.repo.private = value;
  state.permissions = value ? { [memberLogin()]: "none" } : {};
  await sendWebhook("repository", {
    action: value ? "privatized" : "publicized",
    repository: repository(state),
    installation: { id: state.installationId },
    sender: { id: 1999999, login: "admin-gh" },
  });
  await expect
    .poll(memberSees, { timeout: 75_000, intervals: [3_000] })
    .toBe(!value);
}

test("발행 저장소 목록을 본 뒤 비공개로 바뀌면 다른 화면에 갔다 돌아와도 옛 이름을 한 번도 그리지 않는다", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page, seed.member.tokens);
  await page.goto(`/tasks/${taskId}`);
  await expect
    .poll(() => options(page))
    .toContainEqual(expect.stringContaining(state.repo.fullName));
  // 같은 문서 안에서 다른 화면으로 갔다가(클라이언트 이동) 돌아온다.
  await page
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "내 보드" })
    .click();
  await expect(page).toHaveURL(/\/me$/);
  await setPrivate(true);
  await page.evaluate((name) => {
    const w = window as unknown as { leaked: boolean };
    w.leaked = false;
    new MutationObserver(() => {
      if (document.body.innerHTML.includes(name)) w.leaked = true;
    }).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }, state.repo.fullName);
  await page.goBack();
  await expect(select(page)).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(await options(page)).not.toContainEqual(
    expect.stringContaining(state.repo.fullName),
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { leaked: boolean }).leaked,
    ),
  ).toBe(false);
});

test("발행 대상 저장소가 비공개로 바뀌면 포커스 재조회에서 선택지·표시 모두 이름이 사라진다", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await setPrivate(false);
  await signIn(page, seed.member.tokens);
  await page.goto(`/tasks/${taskId}`);
  await expect
    .poll(() => options(page))
    .toContainEqual(expect.stringContaining(state.repo.fullName));
  const target = await select(page)
    .locator("option", { hasText: state.repo.fullName })
    .getAttribute("value");
  await select(page).selectOption(target!);
  await expect(page.getByText(state.repo.fullName).first()).toBeVisible();
  // 발행 시도가 끝나 상태가 안정되기를 기다린다(스텁은 Issue 생성에 실패 응답을 준다).
  await page.waitForLoadState("networkidle");

  await setPrivate(true);
  await refocus(page);
  await expect
    .poll(async () => (await options(page)).join("|"), { timeout: 15_000 })
    .not.toContain(state.repo.fullName);
  await expect(select(page).locator("option:checked")).toHaveText(
    "비공개 저장소",
  );
  expect(await page.content()).not.toContain(state.repo.fullName);
});

test("설정의 연결 저장소 목록은 화면 진입과 포커스 때마다 다시 받는다", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "GET" &&
      request.url().endsWith(`/projects/${seed.project.id}/github/repositories`)
    )
      requests.push(request.url());
  });
  await signIn(page, seed.admin);
  await page.goto(`/projects/${seed.project.id}/settings?tab=integrations`);
  await expect.poll(() => requests.length).toBeGreaterThanOrEqual(1);
  const afterEntry = requests.length;
  await refocus(page);
  await expect.poll(() => requests.length).toBeGreaterThan(afterEntry);
  // 헤드 어드민은 원본 권한이 있어 이름이 보인다(권한 있는 사람에게는 그대로).
  await expect(page.getByText(state.repo.fullName).first()).toBeVisible();
});
