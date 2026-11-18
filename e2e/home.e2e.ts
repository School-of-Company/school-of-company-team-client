import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import type { Server } from "node:http";
import {
  insertOAuthRows,
  pullJson,
  sendWebhook,
  startGithubStub,
  type StubState,
} from "./github-stub";
import { apiGet, apiUrl, readSeed, signIn, type Tokens } from "./support";

// 홈·확인 필요·팀원(단계 5). 데이터는 격리 backend 실제 API로만 만든다(fixture 아님).
// 막힘 2일은 API로 막힌 시각을 되돌릴 수 없어 만들지 않는다(서버 통합 테스트가 경계값을 본다).
// GitHub 신호(CI 실패·리뷰 24시간·merge)는 E2E_GITHUB_STUB_PORT·E2E_GITHUB_WEBHOOK_SECRET·E2E_PG_CONTAINER 가
// 있을 때만 로컬 GitHub 스텁 + 서명 웹훅으로 재현한다(실제 GitHub 아님, github-stub.ts).
// E2E_SCREENSHOT_DIR 가 있으면 라이트·다크 × 1440·390 스크린샷도 남긴다.
const dir = process.env.E2E_SCREENSHOT_DIR;
const stubPort = Number(process.env.E2E_GITHUB_STUB_PORT) || 0;
let stub: Server | undefined;
test.describe.configure({ mode: "serial" });

const seed = readSeed();
const seoul = (offset: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date(Date.now() + offset * 86_400_000),
  );

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

const titles = {
  overdue: "릴리스 노트 초안 정리",
  dueToday: "로그인 리다이렉트 확인",
  dueTomorrow: "세션 만료 안내 문구",
  progress: "홈 API 응답 연결",
  review: "팀원 부하 집계 검토",
  blocked: "배포 스크립트 권한 정리",
  unassigned: "운영 알림 누락 조사",
  personal: "개인 일정 메모",
};

test.beforeAll(async () => {
  const project = `/api/v1/projects/${seed.project.id}`;
  // 참여자를 PM으로 두고 파트 리더도 맡긴다(프로젝트 범위 선택·역할 표시 확인).
  await call("PUT", `${project}/pm`, seed.admin, { userId: seed.member.id });
  const part = await call<{ id: string }>(
    "POST",
    `${project}/parts`,
    seed.admin,
    {
      name: "서버",
    },
  );
  await call("POST", `${project}/parts/${part.id}/members`, seed.admin, {
    userId: seed.member.id,
  });
  await call("PUT", `${project}/parts/${part.id}/leader`, seed.admin, {
    userId: seed.member.id,
  });

  const task = (row: Record<string, unknown>) =>
    call<{ id: string; key: string }>(
      "POST",
      "/api/v1/tasks",
      seed.member.tokens,
      {
        scope: "PROJECT",
        projectId: seed.project.id,
        assigneeIds: [seed.member.id],
        type: "DEV",
        priority: "P2",
        status: "PLANNED",
        ...row,
      },
    );
  const created = [
    await task({ title: titles.overdue, deadline: seoul(-2), priority: "P1" }),
    await task({ title: titles.dueToday, deadline: seoul(0) }),
    await task({ title: titles.dueTomorrow, deadline: seoul(1), type: "TASK" }),
    await task({
      title: titles.progress,
      status: "IN_PROGRESS",
      priority: "P0",
    }),
    await task({ title: titles.review, status: "REVIEW", priority: "P1" }),
    await task({ title: titles.blocked, status: "IN_PROGRESS" }),
    await task({ title: titles.unassigned, assigneeIds: [], priority: "P0" }),
  ];
  const ids = created.map((item) => item.id);
  await call("PATCH", `/api/v1/tasks/${ids[5]}`, seed.member.tokens, {
    blocked: true,
    blockedReason: "운영 서버 SSH 키 발급 대기",
  });
  await call("POST", "/api/v1/tasks", seed.member.tokens, {
    scope: "PERSONAL",
    title: titles.personal,
    type: "TASK",
    priority: "P3",
    status: "IN_PROGRESS",
    deadline: seoul(0),
  });

  const sprint = await call<{ id: string }>(
    "POST",
    `${project}/sprints`,
    seed.admin,
    {
      name: "11월 3주차",
      goal: "홈과 팀원 화면 출시",
      startDate: seoul(-6),
      endDate: seoul(1),
    },
  );
  await call("POST", `${project}/sprints/${sprint.id}/tasks`, seed.admin, {
    taskIds: ids.slice(0, 6),
  });
  await call("POST", `${project}/sprints/${sprint.id}/start`, seed.admin);
  if (stubPort) await githubSignals(created);
});

test.afterAll(() => {
  stub?.close();
});

/** CI 실패(진행 중 업무), 24시간 넘은 리뷰 요청(리뷰 업무), merge됐지만 미완료(내일 마감 업무). */
async function githubSignals(created: readonly { key: string }[]) {
  const githubId = 2_000_000 + parseInt(seed.run, 16);
  const hours = (n: number) =>
    new Date(Date.now() - n * 3_600_000).toISOString();
  const state: StubState = {
    installationId: 77,
    repo: { id: githubId, fullName: `acme/hub-${seed.run}` },
    logins: { [githubId]: `member-${seed.run}` },
    pulls: {
      11: {
        title: `${created[3].key} 홈 API 응답 연결`,
        sha: "a".repeat(40),
        ref: "feat/home-api",
        state: "open",
        draft: false,
        merged: false,
        updatedAt: hours(1),
        requested: [],
      },
      12: {
        title: `${created[4].key} 팀원 부하 집계`,
        sha: "b".repeat(40),
        ref: "feat/members-load",
        state: "open",
        draft: false,
        merged: false,
        updatedAt: hours(30),
        requested: [githubId],
      },
      13: {
        title: `${created[2].key} 세션 만료 안내 문구`,
        sha: "c".repeat(40),
        ref: "fix/session-copy",
        state: "open",
        draft: false,
        merged: false,
        updatedAt: hours(3),
        requested: [],
      },
    },
    suites: [],
  };
  stub = await startGithubStub(state, stubPort);
  insertOAuthRows(process.env.E2E_PG_CONTAINER!, [
    { userId: seed.member.id, githubId, login: `member-${seed.run}` },
  ]);
  await call(
    "POST",
    `/api/v1/projects/${seed.project.id}/github/repositories`,
    seed.admin,
    {
      installationId: state.installationId,
      repositoryId: state.repo.id,
    },
  );
  const repository = {
    id: state.repo.id,
    name: state.repo.fullName.split("/")[1],
    full_name: state.repo.fullName,
    private: false,
    owner: { login: "acme" },
    html_url: `https://github.com/${state.repo.fullName}`,
  };
  const event = (number: number, action: string, extra = {}) =>
    sendWebhook("pull_request", {
      action,
      number,
      pull_request: pullJson(state, number, githubId),
      repository,
      installation: { id: state.installationId },
      sender: { id: githubId, login: state.logins[githubId] },
      ...extra,
    });
  for (const number of [11, 12, 13]) await event(number, "opened");
  await event(12, "review_requested", {
    requested_reviewer: { id: githubId, login: state.logins[githubId] },
  });
  const suite = {
    id: 501,
    head_sha: state.pulls[11].sha,
    conclusion: "failure",
  };
  state.suites.push(suite);
  await sendWebhook("check_suite", {
    action: "completed",
    check_suite: {
      ...suite,
      head_branch: state.pulls[11].ref,
      status: "completed",
      updated_at: hours(0.5),
      app: { slug: "github-actions" },
    },
    repository,
    installation: { id: state.installationId },
    sender: { id: githubId, login: state.logins[githubId] },
  });
  Object.assign(state.pulls[13], {
    state: "closed",
    merged: true,
    updatedAt: hours(2),
  });
  await event(13, "closed");
}

async function open(page: Page, tokens: Tokens, path: string) {
  await signIn(page, tokens);
  await page.goto(path);
}

test("home shows today, attention, and the active sprint from the real API", async ({
  page,
}) => {
  await open(page, seed.member.tokens, "/");
  const attention = page.getByRole("region", { name: "확인 필요" });
  await expect(
    attention.getByRole("heading", { name: /마감 지남/ }),
  ).toBeVisible();
  await expect(attention.getByText(titles.overdue)).toBeVisible();
  await expect(
    attention.getByRole("heading", { name: /오늘·내일 마감/ }),
  ).toBeVisible();
  await expect(attention.getByText("담당자 없음")).toHaveCount(0);
  const today = page.getByRole("region", { name: "오늘 할 일" });
  await expect(today.getByText(titles.progress)).toBeVisible();
  // 내 개인 업무는 내 홈에만 나온다.
  await expect(today.getByText(titles.personal).first()).toBeVisible();
  const sprints = page.getByRole("region", { name: "진행 중 Sprint" });
  await expect(sprints.getByText("11월 3주차")).toBeVisible();
  await expect(sprints.getByText("내일 종료")).toBeVisible();
  await expect(
    attention.getByRole("heading", { name: /Sprint 종료 임박/ }),
  ).toBeVisible();
});

test("project scope lists unassigned high priority work and hides personal tasks", async ({
  page,
}) => {
  await open(page, seed.member.tokens, "/");
  const attention = page.getByRole("region", { name: "확인 필요" });
  await attention
    .getByRole("combobox", { name: "확인 필요 범위" })
    .selectOption(seed.project.id);
  await expect(page).toHaveURL(new RegExp(`attention=${seed.project.id}`));
  await expect(attention.getByText(titles.unassigned)).toBeVisible();
  await expect(attention.getByText("담당자 없음")).toBeVisible();
  await expect(attention.getByText(titles.personal)).toHaveCount(0);
  // 같은 판정을 API로도 확인한다.
  const response = await apiGet<{
    items: { rule: string; task: { title: string } | null }[];
  }>(`/api/v1/projects/${seed.project.id}/attention`, seed.member.tokens);
  expect(
    response.items.some((item) => item.task?.title === titles.personal),
  ).toBe(false);
});

test("GitHub signals reach home through the stub and signed webhooks", async ({
  page,
}) => {
  test.skip(
    !stubPort,
    "E2E_GITHUB_STUB_PORT 가 없으면 GitHub 신호를 만들지 않는다",
  );
  await open(page, seed.member.tokens, "/");
  const attention = page.getByRole("region", { name: "확인 필요" });
  await expect(
    attention.getByRole("heading", { name: /CI 실패/ }),
  ).toBeVisible();
  await expect(
    attention.getByRole("heading", { name: /리뷰 24시간 초과/ }),
  ).toBeVisible();
  await expect(
    attention.getByRole("heading", { name: /merge됐지만 미완료/ }),
  ).toBeVisible();
  const reviews = page.getByRole("region", { name: "리뷰 요청" });
  await expect(reviews.getByText("24시간 초과")).toBeVisible();
});

test("a member without managed projects gets no scope switch", async ({
  page,
}) => {
  await open(page, seed.outsider.tokens, "/");
  const attention = page.getByRole("region", { name: "확인 필요" });
  await expect(
    attention.getByText("지금 확인할 항목이 없습니다."),
  ).toBeVisible();
  await expect(attention.getByRole("combobox")).toHaveCount(0);
});

test("members list shows roles and load, and hides projects the viewer cannot read", async ({
  page,
}) => {
  await open(page, seed.member.tokens, "/members");
  const row = page.getByRole("row", { name: new RegExp(seed.member.name) });
  await expect(row.getByText("PM, 서버 리더")).toBeVisible();
  await expect(
    row.getByText(stubPort ? `GitHub member-${seed.run}` : "GitHub 미연결"),
  ).toBeVisible();
  // 참여자 공개 프로젝트는 비참여자의 목록에 나오지 않는다.
  const outsider = await page.context().newPage();
  await open(outsider, seed.outsider.tokens, "/members");
  const seen = outsider.getByRole("row", {
    name: new RegExp(seed.member.name),
  });
  await expect(seen).toBeVisible();
  await expect(seen.getByText(seed.project.key)).toHaveCount(0);
  await expect(seen.getByText(/GitHub/)).toHaveCount(0);
  await outsider.close();
});

test("sort by load is kept in the URL", async ({ page }) => {
  await open(page, seed.member.tokens, "/members");
  await page.getByRole("button", { name: "부하순" }).click();
  await expect(page).toHaveURL(/sort=load/);
  await expect(page.getByRole("button", { name: "부하순" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

const screens: readonly {
  name: string;
  path: () => string;
  who: "member" | "admin" | "outsider";
  /** 홈 API를 멈추거나(로딩) 끊어서(오류) 그 상태를 재현한다. 응답을 지어내지는 않는다. */
  home?: "hang" | "fail";
  ready: (page: Page) => Promise<void>;
}[] = [
  {
    name: "home",
    who: "member",
    path: () => "/",
    ready: (p) => expect(p.getByText("11월 3주차").first()).toBeVisible(),
  },
  {
    name: "home-project",
    who: "member",
    path: () => `/?attention=${seed.project.id}`,
    ready: (p) => expect(p.getByText("담당자 없음")).toBeVisible(),
  },
  {
    name: "home-empty",
    who: "outsider",
    path: () => "/",
    ready: (p) =>
      expect(p.getByText("지금 확인할 항목이 없습니다.")).toBeVisible(),
  },
  {
    name: "home-loading",
    who: "member",
    home: "hang",
    path: () => "/",
    ready: (p) =>
      expect(p.getByRole("status", { name: "홈을 불러오는 중" })).toBeVisible(),
  },
  {
    name: "home-error",
    who: "member",
    home: "fail",
    path: () => "/",
    ready: (p) =>
      expect(p.getByRole("button", { name: "다시 시도" })).toBeVisible(),
  },
  {
    name: "members",
    who: "member",
    path: () => "/members",
    ready: (p) => expect(p.getByText("PM, 서버 리더")).toBeVisible(),
  },
  {
    name: "members-admin",
    who: "admin",
    path: () => "/members?sort=load",
    ready: (p) =>
      expect(p.getByRole("columnheader", { name: "연결" })).toBeVisible(),
  },
];

const tokensFor = (who: "member" | "admin" | "outsider") =>
  who === "admin" ? seed.admin : seed[who].tokens;

for (const scheme of ["light", "dark"] as const)
  for (const width of [1440, 390] as const)
    test(`screens ${scheme} ${width}`, async ({ browser }) => {
      test.skip(!dir, "E2E_SCREENSHOT_DIR 가 없으면 스크린샷을 찍지 않는다");
      test.setTimeout(180_000);
      mkdirSync(dir!, { recursive: true });
      for (const screen of screens) {
        const context = await browser.newContext({
          colorScheme: scheme,
          reducedMotion: "reduce",
          viewport: { width, height: width === 390 ? 844 : 900 },
          locale: "ko-KR",
        });
        const tab = await context.newPage();
        await signIn(tab, tokensFor(screen.who));
        if (screen.home)
          await tab.route("**/api/v1/home", (route) =>
            screen.home === "fail" ? route.abort("failed") : undefined,
          );
        await tab.goto(screen.path());
        await screen.ready(tab);
        if (!screen.home) await tab.waitForLoadState("networkidle");
        await tab.addStyleTag({
          content: "nextjs-portal { display: none !important; }",
        });
        await tab.screenshot({
          path: `${dir}/${screen.name}-${scheme}-${width}.png`,
          fullPage: true,
        });
        if (width === 390 && screen.name === "home") {
          await tab.getByRole("button", { name: "메뉴 열기" }).click();
          await expect(
            tab.getByRole("dialog", { name: "School of Company" }),
          ).toBeVisible();
          await tab.screenshot({
            path: `${dir}/home-sidebar-open-${scheme}-${width}.png`,
          });
        }
        await context.close();
      }
    });
