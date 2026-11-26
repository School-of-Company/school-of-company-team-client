import { test, expect } from "@playwright/test";
import { stubDetail, taskFixture } from "./task-detail-feedback.fixture";

// 곁가지 조회(관련 문서, GitHub, 저장소)가 실패해도 업무 상세는 바로 그려지고, 실패한 조회를 계속 다시 부르지 않는다.
// 회귀: 상세가 모든 조회를 함께 기다릴 때 하나만 실패해도 스켈레톤이 내려가지 않고 12초에 27번쯤 다시 요청했다.
for (const surface of ["page", "panel"] as const)
  test(`곁가지 조회 실패 ${surface}`, async ({ page }) => {
    await stubDetail(page, "PROJECT");
    const calls = { knowledge: 0, github: 0, repositories: 0 };
    // 나중에 등록한 route 가 먼저 걸린다(stubDetail 의 기본 응답보다 앞선다).
    await page.route("**/api/v1/knowledge**", (route) => {
      calls.knowledge += 1;
      return route.fulfill({
        status: 403,
        json: { code: "FORBIDDEN", message: "문서를 볼 권한이 없습니다." },
      });
    });
    await page.route(`**/api/v1/tasks/${taskFixture.id}/github`, (route) => {
      calls.github += 1;
      return route.fulfill({
        status: 500,
        json: { code: "INTERNAL", message: "GitHub 연결 오류" },
      });
    });
    await page.route("**/github/repositories", (route) => {
      calls.repositories += 1;
      return route.fulfill({
        status: 403,
        json: { code: "FORBIDDEN", message: "권한 없음" },
      });
    });
    await page.goto(
      surface === "page"
        ? `/tasks/${taskFixture.id}`
        : `/me?task=${taskFixture.id}`,
    );
    const detail = page.locator(".task-detail");
    await expect(
      detail.getByRole("heading", { name: taskFixture.title }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(detail.getByText("문서를 볼 권한이 없습니다.")).toBeVisible();
    await expect(
      detail.getByRole("heading", {
        name: "GitHub 연결을 불러오지 못했어요",
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[aria-label="업무를 불러오는 중"]')).toHaveCount(
      0,
    );
    const settled = { ...calls };
    await page.waitForTimeout(4_000);
    // 4xx 는 다시 받지 않고, 실패 화면이 뜬 뒤에는 저절로 다시 부르지 않는다(사람이 다시 시도를 누를 때만).
    expect(calls.knowledge).toBeLessThanOrEqual(2);
    expect(calls.repositories).toBeLessThanOrEqual(2);
    expect(calls.github).toBe(settled.github);
    expect(calls.knowledge).toBe(settled.knowledge);
  });
