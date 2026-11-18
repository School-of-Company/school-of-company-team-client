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

// 같은 문서(같은 QueryClient)에서 원본 저장소가 비공개 → 공개 → 비공개로 바뀌기를 3번 되풀이해도
// 가져온 업무가 매번 바로 화면에서 빠지고, 화면 밖 목록에서도 다시 그려지지 않는지(V-cache retry-1 M1).
// 실제 API + 로컬 GitHub 스텁·서명 웹훅(실제 GitHub 아님). 서버는 M2(#47) 이후 main 이어야 한다.
const stubPort = Number(process.env.E2E_GITHUB_STUB_PORT) || 0;
test.skip(!stubPort, "GitHub 스텁 변수가 없으면 Issue를 가져올 수 없다");

const seed = readSeed();
const issueTitle = `비공개 반복 점검 Issue ${seed.run}`;
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
    repo: { id: githubId + 3, fullName: `acme/cycle-${seed.run}` },
    logins: { [githubId]: memberLogin(), 1999999: "admin-gh" },
    permissions: {},
    pulls: {},
    issues: { 7: { title: issueTitle, updatedAt: new Date().toISOString() } },
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
  const imported = await call<{ taskId: string }>(
    "POST",
    "/api/v1/github/issue-imports",
    seed.member.tokens,
    {
      url: `https://github.com/${state.repo.fullName}/issues/7`,
      scope: "PROJECT",
      projectId: seed.project.id,
    },
  );
  taskId = imported.taskId;
  await call("PATCH", `/api/v1/tasks/${taskId}`, seed.member.tokens, {
    assigneeIds: [seed.member.id],
  });
});

test.afterAll(() => {
  stub?.close();
});

/** 팀원이 그 업무 단건을 읽을 수 있는지(서버 원본 권한 캐시 최대 60초를 기다린다). */
const memberReads = async () =>
  (
    await fetch(`${apiUrl}/api/v1/tasks/${taskId}`, {
      headers: { authorization: `Bearer ${seed.member.tokens.accessToken}` },
    })
  ).status === 200;

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
    .poll(memberReads, { timeout: 75_000, intervals: [2_000] })
    .toBe(!value);
}

const nav = (page: Page, name: string | RegExp) =>
  page
    .locator("aside.app-sidebar")
    .getByRole("link", { name, exact: typeof name === "string" })
    .click();

test("같은 화면에서 비공개 → 공개 → 비공개를 3번 되풀이해도 매번 바로 빠지고 다시 그려지지 않는다", async ({
  page,
}) => {
  test.setTimeout(420_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, seed.member.tokens);
  await page.goto(`/projects/${seed.project.id}`);
  // Next 가 숨겨 둔 이전 화면의 DOM 은 보이지 않으므로(검증 I1) 보이는 카드만 센다.
  const card = page.locator("article.board-card:visible", {
    hasText: issueTitle,
  });
  const hits: number[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "GET" &&
      new URL(request.url()).pathname === `/api/v1/tasks/${taskId}`
    )
      hits.push(Date.now());
  });

  for (const round of [1, 2, 3]) {
    await expect(card, `${round}회차 시작: 보드에 카드`).toBeVisible({
      timeout: 20_000,
    });
    await setPrivate(true);

    const clickedAt = Date.now();
    await card.getByRole("link", { name: issueTitle }).click();
    const panel = page.getByRole("dialog", { name: "업무 상세" });
    await expect(
      panel.getByText("업무를 찾을 수 없거나 접근할 수 없습니다"),
    ).toBeVisible();
    // 패널 뒤 보드에서 그 카드가 3초 안에 빠진다(다음 폴링을 기다리지 않는다).
    await expect(card, `${round}회차: 패널 뒤 카드 제외`).toHaveCount(0, {
      timeout: 3_000,
    });
    expect(Date.now() - clickedAt).toBeLessThan(3_500);
    await page.waitForTimeout(Math.max(0, clickedAt + 20_000 - Date.now()));
    const detailHits = hits.filter((at) => at >= clickedAt).length;
    console.log(`[${round}회차] 20초 상세 요청 ${detailHits}회`);
    expect(detailHits).toBeLessThanOrEqual(2);

    // 닫고 화면 밖이던 내 보드로 클라이언트 이동해도 제목이 한 번도 그려지지 않는다.
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await page.evaluate((title) => {
      const w = window as unknown as { leaked: boolean };
      w.leaked = false;
      new MutationObserver(() => {
        if (document.body.innerText.includes(title)) w.leaked = true;
      }).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }, issueTitle);
    await nav(page, "내 보드");
    await expect(page).toHaveURL(/\/me$/);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1_500);
    expect(
      await page.evaluate(
        () => (window as unknown as { leaked: boolean }).leaked,
      ),
      `${round}회차: 내 보드에서 다시 그려짐`,
    ).toBe(false);

    // 다시 공개: 권한 있는 상태로 돌아오면 다시 보인다(영구 숨김 아님).
    await setPrivate(false);
    await expect(
      page.locator("article.board-card:visible", { hasText: issueTitle }),
      `${round}회차: 공개 복귀 후 내 보드에 다시 보임`,
    ).toBeVisible({ timeout: 20_000 });
    await nav(page, seed.project.name);
    await expect(page).toHaveURL(new RegExp(`/projects/${seed.project.id}$`));
  }
});
