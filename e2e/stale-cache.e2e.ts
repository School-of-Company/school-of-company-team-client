import type { Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import {
  insertOAuthRows,
  memberGithubId,
  pullJson,
  sendWebhook,
  startGithubStub,
  type StubState,
} from "./github-stub";
import { apiGet, apiUrl, readSeed, signIn, type Tokens } from "./support";

// 비공개 전환·삭제된 업무가 캐시로 남지 않는지(M2 hotfix의 클라이언트 짝).
// 리뷰 요청은 실제 API + 로컬 GitHub 스텁·서명 웹훅(실제 GitHub 아님)으로 만든다.
// 오류는 요청을 가로채 상태 코드만 바꿔 넣는다(503·404). 목록 내용을 지어내지 않는다.
// E2E_GITHUB_STUB_PORT·E2E_GITHUB_WEBHOOK_SECRET·E2E_PG_CONTAINER 가 없으면 건너뛴다.
const stubPort = Number(process.env.E2E_GITHUB_STUB_PORT) || 0;
test.skip(!stubPort, "GitHub 스텁 변수가 없으면 리뷰 요청을 만들 수 없다");
test.describe.configure({ mode: "serial" });

const seed = readSeed();
const taskTitle = "리뷰 캐시 점검 업무";
const prTitle = "캐시 점검 PR";
let taskId = "";
let stub: Server | undefined;

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

test.beforeAll(async () => {
  const githubId = memberGithubId(seed.run);
  const task = await call<{ id: string; key: string }>(
    "POST",
    "/api/v1/tasks",
    seed.member.tokens,
    {
      scope: "PROJECT",
      projectId: seed.project.id,
      assigneeIds: [seed.member.id],
      title: taskTitle,
      type: "DEV",
      priority: "P2",
      status: "REVIEW",
    },
  );
  taskId = task.id;
  const state: StubState = {
    installationId: 77,
    repo: { id: githubId + 1, fullName: `acme/cache-${seed.run}` },
    logins: { [githubId]: `member-${seed.run}`, 1999999: "admin-gh" },
    pulls: {
      21: {
        title: `${task.key} ${prTitle}`,
        sha: "d".repeat(40),
        ref: "fix/cache",
        state: "open",
        draft: false,
        merged: false,
        updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
        requested: [githubId],
      },
    },
    suites: [],
  };
  stub = await startGithubStub(state, stubPort);
  const admin = await apiGet<{ id: string }>("/api/v1/me", seed.admin);
  insertOAuthRows(process.env.E2E_PG_CONTAINER!, [
    { userId: seed.member.id, githubId, login: `member-${seed.run}` },
    { userId: admin.id, githubId: 1_999_999, login: "admin-gh" },
  ]);
  await call(
    "POST",
    `/api/v1/projects/${seed.project.id}/github/repositories`,
    seed.admin,
    { installationId: state.installationId, repositoryId: state.repo.id },
  );
  const event = (action: string, extra = {}) =>
    sendWebhook("pull_request", {
      action,
      number: 21,
      pull_request: pullJson(state, 21, githubId),
      repository: {
        id: state.repo.id,
        name: state.repo.fullName.split("/")[1],
        full_name: state.repo.fullName,
        private: false,
        owner: { login: "acme" },
        html_url: `https://github.com/${state.repo.fullName}`,
      },
      installation: { id: state.installationId },
      sender: { id: githubId, login: state.logins[githubId] },
      ...extra,
    });
  await event("opened");
  await event("review_requested", {
    requested_reviewer: { id: githubId, login: state.logins[githubId] },
  });
});

test.afterAll(() => {
  stub?.close();
});

// 리뷰 요청은 내 업무(목록) 화면에 있다. 데이터는 홈 응답에 실려 온다.
async function openMyBoard(page: Page) {
  await signIn(page, seed.member.tokens);
  await page.goto("/");
  const reviews = page.getByRole("region", { name: "리뷰 요청" });
  await expect(reviews.getByText(prTitle)).toBeVisible();
  return reviews;
}

const failWith = (page: Page, status: number, code: string) =>
  page.route("**/api/v1/home", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ code, message: "주입한 오류" }),
    }),
  );

test("일시 장애(503)면 60초까지만 마지막 목록을 두고, 넘으면 비운다", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const reviews = await openMyBoard(page);
  const lastSuccess = Date.now();
  await failWith(page, 503, "SERVICE_UNAVAILABLE");
  // 다음 폴링(10초)이 실패하면 목록은 남고 비차단 안내가 붙는다.
  await expect(reviews.getByText("마지막으로 받은 목록")).toBeVisible({
    timeout: 15_000,
  });
  await expect(reviews.getByText(prTitle)).toBeVisible();
  expect(Date.now() - lastSuccess).toBeLessThan(60_000);
  // 마지막 성공 후 60초가 지나면 목록을 비우고 오류만 보인다.
  await expect(reviews.getByText(prTitle)).toBeHidden({ timeout: 70_000 });
  expect(Date.now() - lastSuccess).toBeGreaterThanOrEqual(59_000);
  await expect(
    reviews.getByRole("alert").getByText(/최신 정보를 불러오지 못했어요/),
  ).toBeVisible();
});

for (const [status, code] of [
  [404, "TASK_NOT_FOUND"],
  [403, "PROJECT_FORBIDDEN"],
] as const)
  test(`${status} 응답이면 다음 조회에서 바로 목록을 비운다`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const reviews = await openMyBoard(page);
    const started = Date.now();
    await failWith(page, status, code);
    await expect(reviews.getByText(prTitle)).toBeHidden({ timeout: 15_000 });
    expect(Date.now() - started).toBeLessThan(15_000);
    await expect(reviews.getByText("마지막으로 받은 목록")).toHaveCount(0);
  });

test("상세가 404가 된 업무는 뒤로 가도 내 보드·리뷰 요청 캐시에서 다시 보이지 않는다", async ({
  page,
}) => {
  const reviews = await openMyBoard(page);
  await expect(page.getByText(taskTitle).first()).toBeVisible();
  // 업무가 사라진다(비공개 전환과 같은 404 TASK_NOT_FOUND).
  await call("DELETE", `/api/v1/tasks/${taskId}`, seed.member.tokens);
  await reviews.getByRole("link", { name: new RegExp(taskTitle) }).click();
  await expect(
    page.getByText("업무를 찾을 수 없거나 접근할 수 없어요"),
  ).toBeVisible();
  // 같은 문서에서 뒤로 가므로, 돌아오는 동안 그 제목이 한 번이라도 그려지는지 지켜본다.
  await page.evaluate((title) => {
    const w = window as unknown as { reappeared: boolean };
    w.reappeared = false;
    new MutationObserver(() => {
      if (!document.body.innerText.includes(title)) return;
      w.reappeared = true;
      const hit = [...document.querySelectorAll("a, li, article, h1, h2, p")]
        .filter((el) => el.textContent?.includes(title))
        .map((el) => `${el.tagName}.${el.className}|${location.pathname}`);
      (w as unknown as { where: string[] }).where ??= [];
      (w as unknown as { where: string[] }).where.push(...hit.slice(-2));
    }).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }, taskTitle);
  await page.goBack();
  await expect(page).toHaveURL(/\/me$/);
  await expect(reviews).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(taskTitle)).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as unknown as { where?: string[] }).where ?? [],
    ),
  ).toEqual([]);
});
