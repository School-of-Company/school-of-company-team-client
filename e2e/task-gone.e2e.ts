import { expect, test, type Page } from "@playwright/test";
import { apiUrl, readSeed, signIn, type Tokens } from "./support";

// 보드에서 연 업무가 이미 사라졌을 때(404) 정리·재요청이 반복되지 않는지(V-cache H1).
// 업무 삭제로 404를 만든다(비공개 전환과 같은 TASK_NOT_FOUND). 실제 API, 응답을 지어내지 않는다.

const seed = readSeed();

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

const createTask = (title: string, scope: "PROJECT" | "TEAM" | "PERSONAL") =>
  call<{ id: string }>("POST", "/api/v1/tasks", seed.member.tokens, {
    scope,
    ...(scope === "PROJECT" ? { projectId: seed.project.id } : {}),
    assigneeIds: scope === "PERSONAL" ? [] : [seed.member.id],
    title,
    type: "TASK",
    priority: "P2",
    status: "PLANNED",
  });

/** 이 업무 단건 GET 요청 수를 센다. */
function countDetail(page: Page, taskId: string) {
  const hits: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "GET" &&
      new URL(request.url()).pathname === `/api/v1/tasks/${taskId}`
    )
      hits.push(request.url());
  });
  return hits;
}

const boards = [
  {
    name: "데스크톱 프로젝트 보드",
    scope: "PROJECT" as const,
    path: () => `/projects/${seed.project.id}`,
  },
  { name: "내 보드", scope: "PERSONAL" as const, path: () => "/me" },
  { name: "팀 공용 보드", scope: "TEAM" as const, path: () => "/team" },
];

for (const board of boards)
  test(`${board.name}: 사라진 업무 카드를 열면 404 안내를 한 번 보이고 20초 동안 상세 요청은 2회 이하`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const title = `사라질 업무 ${board.scope} ${Date.now()}`;
    const task = await createTask(title, board.scope);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page, seed.member.tokens);
    await page.goto(board.path());
    const card = page.locator("article.board-card", { hasText: title });
    await expect(card).toBeVisible();
    await call("DELETE", `/api/v1/tasks/${task.id}`, seed.member.tokens);

    const hits = countDetail(page, task.id);
    await card.getByRole("link", { name: title }).click();
    const panel = page.getByRole("dialog", { name: "업무 상세" });
    await expect(
      panel.getByText("업무를 찾을 수 없거나 접근할 수 없습니다"),
    ).toBeVisible();
    await page.waitForTimeout(20_000);
    // 패널은 열린 채 안내를 유지한다(언마운트·재마운트 없음).
    await expect(
      panel.getByText("업무를 찾을 수 없거나 접근할 수 없습니다"),
    ).toBeVisible();
    console.log(`[${board.name}] 20초 상세 요청 ${hits.length}회`);
    expect(hits.length).toBeLessThanOrEqual(2);
    // 닫으면 보드로 돌아오고 그 카드는 없다. 닫은 뒤에도 다시 요청하지 않는다.
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(card).toHaveCount(0);
    const afterClose = hits.length;
    await page.waitForTimeout(3_000);
    expect(hits.length).toBe(afterClose);
  });

test("상세 페이지: 사라진 업무를 열면 404 안내를 보이고 20초 동안 상세 요청은 2회 이하", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const task = await createTask(`사라질 상세 업무 ${Date.now()}`, "PROJECT");
  await call("DELETE", `/api/v1/tasks/${task.id}`, seed.member.tokens);
  await signIn(page, seed.member.tokens);
  const hits = countDetail(page, task.id);
  await page.goto(`/tasks/${task.id}`);
  await expect(
    page.getByText("업무를 찾을 수 없거나 접근할 수 없습니다"),
  ).toBeVisible();
  await page.waitForTimeout(20_000);
  console.log(`[상세 페이지] 20초 상세 요청 ${hits.length}회`);
  expect(hits.length).toBeLessThanOrEqual(2);
});

test("권한이 돌아오면 같은 화면의 404 안내에서 다시 시도로 그 상세를 다시 연다", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const project = `/api/v1/projects/${seed.project.id}`;
  const visibility = (value: "TEAM" | "MEMBERS") =>
    call("PATCH", project, seed.admin, { visibility: value });
  const title = `권한 회복 점검 ${Date.now()}`;
  const task = await createTask(title, "PROJECT");
  // 비참여자(outsider)는 팀 전체 공개일 때만 읽는다.
  await visibility("TEAM");
  try {
    await signIn(page, seed.outsider.tokens);
    await page.goto(`/tasks/${task.id}`);
    await expect(
      page.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
    await visibility("MEMBERS");
    // 다음 폴링(10초)에 404 안내로 바뀐다.
    const notice = page.getByText(/찾을 수 없거나 접근할 수 없습니다/);
    await expect(notice).toBeVisible({ timeout: 20_000 });
    await visibility("TEAM");
    await page.getByRole("button", { name: "다시 시도" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
    await expect(notice).toHaveCount(0);
  } finally {
    await visibility("MEMBERS");
  }
});
