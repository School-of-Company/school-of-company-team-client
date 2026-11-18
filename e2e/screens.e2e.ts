import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { apiUrl, readSeed, signIn, type Tokens } from "./support";

// 화면 회귀 스크린샷: 전 화면 × 라이트·다크 × 1440·390. E2E_SCREENSHOT_DIR 가 있을 때만 돈다.
// 데이터는 격리 backend 실제 API 로 만든다(fixture 아님).
const dir = process.env.E2E_SCREENSHOT_DIR;
// 쉼표로 화면 이름을 주면 그 화면만 찍는다(예: E2E_SCREENS=me-empty,account).
const only = process.env.E2E_SCREENS?.split(",");
test.skip(!dir, "E2E_SCREENSHOT_DIR 가 없으면 스크린샷을 찍지 않는다");
test.describe.configure({ mode: "serial" });

const seed = readSeed();
let taskId = "";

async function post(path: string, tokens: Tokens, body: unknown) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${tokens.accessToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`POST ${path} → ${response.status}`);
  return (await response.json()) as { id: string };
}

test.beforeAll(async () => {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const base = {
    scope: "PROJECT",
    projectId: seed.project.id,
    assigneeIds: [seed.member.id],
  };
  const rows = [
    {
      title: "로그인 화면 대비 점검",
      status: "BACKLOG",
      type: "TASK",
      priority: "P2",
    },
    {
      title: "보드 폴링 깜빡임 확인",
      status: "PLANNED",
      type: "DEV",
      priority: "P1",
      deadline: tomorrow,
    },
    {
      title: "업무 상세 속성 열 정리",
      status: "IN_PROGRESS",
      type: "DEV",
      priority: "P0",
    },
    {
      title: "모바일 사이드바 포커스 복귀",
      status: "REVIEW",
      type: "DEV",
      priority: "P1",
    },
    { title: "CI 워크플로 추가", status: "DONE", type: "DEV", priority: "P3" },
  ];
  for (const row of rows) {
    const created = await post("/api/v1/tasks", seed.member.tokens, {
      ...base,
      ...row,
      description: "## 확인할 것\n- 라이트·다크\n- 1440·390",
    });
    taskId ||= created.id;
  }
  await post("/api/v1/tasks", seed.member.tokens, {
    scope: "PERSONAL",
    title: "개인 메모 정리",
    type: "TASK",
    priority: "P3",
    status: "PLANNED",
  });
});

const screens: readonly {
  name: string;
  path: () => string;
  who?: "member" | "admin" | "outsider";
  /** 보드 API 를 멈추거나(로딩) 끊어서(오류) 그 상태를 재현한다. 응답을 지어내지는 않는다. */
  board?: "hang" | "fail";
  ready: (page: Page) => Promise<void>;
}[] = [
  {
    name: "login",
    path: () => "/login",
    ready: (p) =>
      expect(p.getByRole("heading", { name: "로그인" })).toBeVisible(),
  },
  {
    name: "pending-suspended",
    path: () => "/pending?status=SUSPENDED",
    ready: (p) =>
      expect(
        p.getByRole("heading", { name: "이용이 중지되었습니다" }),
      ).toBeVisible(),
  },
  {
    name: "pending-rejected",
    path: () => "/pending?status=REJECTED",
    ready: (p) =>
      expect(
        p.getByRole("heading", { name: "가입 승인이 거절되었습니다" }),
      ).toBeVisible(),
  },
  {
    name: "me",
    who: "member",
    path: () => "/me",
    ready: (p) => expect(p.locator("article.board-card").first()).toBeVisible(),
  },
  {
    name: "me-empty",
    who: "outsider",
    path: () => "/me",
    ready: (p) => expect(p.getByText("업무 0개")).toBeVisible(),
  },
  {
    name: "me-empty-filtered",
    who: "outsider",
    path: () => "/me?priority=P0",
    ready: (p) =>
      expect(
        p.getByRole("heading", { name: "조건에 맞는 업무가 없습니다" }),
      ).toBeVisible(),
  },
  {
    name: "team",
    who: "member",
    path: () => "/team",
    ready: (p) =>
      expect(
        p.getByRole("heading", { level: 1, name: "팀 공용 보드" }),
      ).toBeVisible(),
  },
  {
    name: "projects",
    who: "member",
    path: () => "/projects",
    ready: (p) =>
      expect(
        p.getByRole("link", { name: seed.project.name }).last(),
      ).toBeVisible(),
  },
  {
    name: "project-board",
    who: "member",
    path: () => `/projects/${seed.project.id}`,
    ready: (p) => expect(p.locator("article.board-card").first()).toBeVisible(),
  },
  {
    name: "board-loading",
    who: "member",
    board: "hang",
    path: () => `/projects/${seed.project.id}`,
    ready: (p) =>
      expect(
        p.getByRole("status", { name: "보드를 불러오는 중" }),
      ).toBeVisible(),
  },
  {
    name: "board-error",
    who: "member",
    board: "fail",
    path: () => `/projects/${seed.project.id}`,
    ready: (p) =>
      expect(p.getByRole("button", { name: "다시 시도" })).toBeVisible({
        timeout: 20_000,
      }),
  },
  {
    name: "project-denied",
    who: "outsider",
    path: () => `/projects/${seed.project.id}`,
    ready: (p) =>
      expect(
        p.getByText("프로젝트를 찾을 수 없거나 접근할 수 없습니다"),
      ).toBeVisible(),
  },
  {
    name: "project-settings",
    who: "admin",
    path: () => `/projects/${seed.project.id}/settings`,
    ready: (p) => expect(p.getByRole("heading", { level: 1 })).toBeVisible(),
  },
  {
    name: "task",
    who: "member",
    path: () => `/tasks/${taskId}`,
    ready: (p) =>
      expect(
        p.getByRole("heading", { level: 1, name: "로그인 화면 대비 점검" }),
      ).toBeVisible(),
  },
  {
    name: "admin",
    who: "admin",
    path: () => "/admin",
    ready: (p) =>
      expect(
        p.getByRole("heading", { level: 1, name: "관리자 설정" }),
      ).toBeVisible(),
  },
  {
    name: "admin-denied",
    who: "member",
    path: () => "/admin",
    ready: (p) => expect(p.getByText("관리자 권한이 필요합니다")).toBeVisible(),
  },
  {
    name: "account",
    who: "member",
    path: () => "/account",
    ready: (p) => expect(p.getByRole("heading", { level: 1 })).toBeVisible(),
  },
];

const tokensFor = (who: "member" | "admin" | "outsider") =>
  who === "admin" ? seed.admin : seed[who].tokens;

for (const scheme of ["light", "dark"] as const)
  for (const width of [1440, 390] as const)
    test(`${scheme} ${width}`, async ({ browser }) => {
      test.setTimeout(240_000);
      mkdirSync(dir!, { recursive: true });
      for (const screen of screens.filter(
        (item) => !only || only.includes(item.name),
      )) {
        const context = await browser.newContext({
          colorScheme: scheme,
          reducedMotion: "reduce",
          viewport: { width, height: width === 390 ? 844 : 900 },
          locale: "ko-KR",
        });
        const tab = await context.newPage();
        if (screen.who) await signIn(tab, tokensFor(screen.who));
        if (screen.board)
          await tab.route("**/api/v1/board?**", (route) =>
            screen.board === "fail" ? route.abort("failed") : undefined,
          );
        await tab.goto(screen.path());
        await screen.ready(tab);
        if (!screen.board) await tab.waitForLoadState("networkidle");
        // next dev 표시기는 제품 화면이 아니다.
        await tab.addStyleTag({
          content: "nextjs-portal { display: none !important; }",
        });
        await tab.screenshot({
          path: `${dir}/${screen.name}-${scheme}-${width}.png`,
          fullPage: true,
        });
        if (width === 390 && screen.who && screen.name === "me") {
          await tab.getByRole("button", { name: "메뉴 열기" }).click();
          await expect(
            tab.getByRole("dialog", { name: "School of Company" }),
          ).toBeVisible();
          await tab.screenshot({
            path: `${dir}/sidebar-open-${scheme}-${width}.png`,
          });
        }
        await context.close();
      }
    });
