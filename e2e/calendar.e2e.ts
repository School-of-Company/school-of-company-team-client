import { expect, test, type Page } from "@playwright/test";
import { apiUrl, readSeed, signIn, type Tokens } from "./support";

// 달력(서버 docs/spec/s11-calendar.md): 실제 API 로 일정 만들기·고치기·지우기, 업무 마감 모아 보기, 프로젝트 탭, 비참여자 가시성을 본다.
const seed = readSeed();
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
}).format(new Date());
const teamTitle = `E2E 팀 회의 ${seed.run}`;
const projectTitle = `E2E 프로젝트 데모 ${seed.run}`;
const taskTitle = `E2E 달력 마감 ${seed.run}`;

test.describe.configure({ mode: "serial" });

const chip = (page: Page, text: string) =>
  page.locator(".calendar-grid .calendar-chip", { hasText: text });

async function apiPost<T>(path: string, tokens: Tokens, body: unknown) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${tokens.accessToken}`,
    },
    body: JSON.stringify(body),
  });
  expect(response.status).toBe(201);
  return (await response.json()) as T;
}

test("팀원이 사이드바에서 달력을 열고 시각 있는 팀 일정을 만든다", async ({
  page,
}) => {
  await signIn(page, seed.member.tokens);
  await page.goto("/me");
  await page.getByRole("link", { name: "달력" }).first().click();
  await expect(page).toHaveURL(/\/calendar$/);
  await expect(
    page.getByRole("heading", { name: "달력", level: 1 }),
  ).toBeVisible();
  await page.getByRole("button", { name: "새 일정" }).click();
  const dialog = page.getByRole("dialog", { name: "새 일정" });
  await dialog.getByRole("button", { name: "일정 만들기" }).click();
  await expect(dialog.getByText("제목을 입력하세요.")).toBeVisible();
  await dialog.getByLabel("제목 (필수)").fill(teamTitle);
  await dialog.getByLabel("종일").uncheck();
  await dialog.getByLabel("시작 시각").fill("14:00");
  await dialog.getByLabel("종료 시각").fill("13:00");
  await dialog.getByRole("button", { name: "일정 만들기" }).click();
  await expect(
    dialog.getByText("종료 시각은 시작 시각보다 이를 수 없어요."),
  ).toBeVisible();
  await dialog.getByLabel("종료 시각").fill("15:00");
  await dialog.getByRole("button", { name: "일정 만들기" }).click();
  await expect(page.getByText("일정을 만들었어요.")).toBeVisible();
  await expect(chip(page, teamTitle)).toContainText("14:00");
});

test("프로젝트 탭 달력에 업무 마감과 프로젝트 일정이 모이고, 비참여자에게는 팀 일정만 보인다", async ({
  page,
}) => {
  const task = await apiPost<{ id: string }>(
    "/api/v1/tasks",
    seed.member.tokens,
    {
      projectId: seed.project.id,
      title: taskTitle,
      deadline: today,
    },
  );
  await signIn(page, seed.member.tokens);
  await page.goto(`/projects/${seed.project.id}`);
  await page
    .getByRole("navigation", { name: /프로젝트 메뉴/ })
    .getByRole("link", { name: "달력" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/projects/${seed.project.id}/calendar$`),
  );
  await expect(chip(page, taskTitle)).toContainText(`${seed.project.key}-`);
  // 프로젝트 달력에는 팀 공용 일정이 없다.
  await expect(chip(page, teamTitle)).toHaveCount(0);

  await page.getByRole("button", { name: "새 일정" }).click();
  const dialog = page.getByRole("dialog", { name: "새 일정" });
  await dialog.getByLabel("제목 (필수)").fill(projectTitle);
  await dialog.getByRole("button", { name: "일정 만들기" }).click();
  await expect(chip(page, projectTitle)).toBeVisible();

  // 업무 칩은 업무 상세로 간다.
  await chip(page, taskTitle).click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}$`));

  // 팀 달력에는 셋 다, 비참여자 팀 달력에는 팀 일정만.
  await page.goto("/calendar");
  for (const title of [teamTitle, projectTitle, taskTitle])
    await expect(chip(page, title)).toBeVisible();
  const outsider = await page.context().browser()!.newPage();
  await signIn(outsider, seed.outsider.tokens);
  await outsider.goto("/calendar");
  await expect(chip(outsider, teamTitle)).toBeVisible();
  await expect(chip(outsider, projectTitle)).toHaveCount(0);
  await expect(chip(outsider, taskTitle)).toHaveCount(0);
  // 남의 일정은 보기만 한다.
  await chip(outsider, teamTitle).click();
  const view = outsider.getByRole("dialog", { name: teamTitle });
  await expect(view.getByText(seed.member.name)).toBeVisible();
  await expect(view.getByRole("button", { name: "변경 저장" })).toHaveCount(0);
  await outsider.close();
});

test("만든 사람이 일정을 고치고 지운다", async ({ page }) => {
  await signIn(page, seed.member.tokens);
  await page.goto("/calendar");
  await chip(page, teamTitle).click();
  const dialog = page.getByRole("dialog", { name: "일정 고치기" });
  await dialog.getByLabel("종일").check();
  await dialog.getByLabel("설명").fill("안건: 달력 리뷰");
  await dialog.getByRole("button", { name: "변경 저장" }).click();
  await expect(page.getByText("일정을 고쳤어요.")).toBeVisible();
  await expect(chip(page, teamTitle)).not.toContainText("14:00");

  await chip(page, teamTitle).click();
  const again = page.getByRole("dialog", { name: "일정 고치기" });
  await expect(again.getByLabel("설명")).toHaveValue("안건: 달력 리뷰");
  await again.getByRole("button", { name: "일정 지우기" }).click();
  await again.getByRole("button", { name: "지우기", exact: true }).click();
  await expect(page.getByText("일정을 지웠어요.")).toBeVisible();
  await expect(chip(page, teamTitle)).toHaveCount(0);
});

test("날짜를 누르면 그날 목록이 열리고 거기서 일정을 더한다", async ({
  page,
}) => {
  await signIn(page, seed.member.tokens);
  await page.goto("/calendar");
  await page.locator('.calendar-day-number[aria-current="date"]').click();
  const day = page.getByRole("dialog");
  await expect(
    day.getByRole("link", { name: new RegExp(taskTitle) }),
  ).toBeVisible();
  await day.getByRole("button", { name: "이 날 일정 추가" }).click();
  const create = page.getByRole("dialog", { name: "새 일정" });
  // 시작일은 DatePicker 라 폼에 실리는 숨은 값으로 확인한다.
  await expect(create.locator('input[name="startDate"]')).toHaveValue(today);
});
