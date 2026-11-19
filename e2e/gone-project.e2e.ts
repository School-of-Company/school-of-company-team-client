import { expect, test } from "@playwright/test";
import { apiUrl, readSeed, signIn } from "./support";

// 업무 단건은 200인데 프로젝트 상세만 404면 정리·재조회가 반복되던 것(V-cache retry-2 L2).
// 실제 서버로는 경합으로만 생겨, 프로젝트 상세 요청의 상태 코드만 404로 바꿔 넣는다(업무·목록 응답은 실제 API).
const seed = readSeed();

test("업무는 200, 프로젝트 상세만 404면 안내를 보이고 20초 동안 프로젝트 요청은 2회 이하", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const response = await fetch(`${apiUrl}/api/v1/tasks`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${seed.member.tokens.accessToken}`,
    },
    body: JSON.stringify({
      scope: "PROJECT",
      projectId: seed.project.id,
      assigneeIds: [seed.member.id],
      title: `프로젝트만 404 점검 ${Date.now()}`,
      type: "TASK",
      priority: "P2",
      status: "PLANNED",
    }),
  });
  expect(response.ok).toBe(true);
  const task = (await response.json()) as { id: string };

  const path = `/api/v1/projects/${seed.project.id}`;
  const hits: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "GET" && new URL(request.url()).pathname === path)
      hits.push(request.url());
  });
  await page.route(`**${path}`, (route) =>
    route.request().method() === "GET"
      ? route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            code: "PROJECT_NOT_FOUND",
            message: "주입한 오류",
          }),
        })
      : route.continue(),
  );
  await signIn(page, seed.member.tokens);
  await page.goto(`/tasks/${task.id}`);
  await expect(
    page.getByText("프로젝트를 찾을 수 없거나 접근할 수 없습니다"),
  ).toBeVisible();
  await page.waitForTimeout(20_000);
  console.log(`[프로젝트만 404] 20초 프로젝트 요청 ${hits.length}회`);
  expect(hits.length).toBeLessThanOrEqual(2);
  await expect(
    page.getByText("프로젝트를 찾을 수 없거나 접근할 수 없습니다"),
  ).toBeVisible();
});
