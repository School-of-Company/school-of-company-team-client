import { expect, test } from "@playwright/test";
import { apiGet, apiUrl, readSeed, signIn } from "./support";

// 단계 7 사고·사후 검토·지식 문서: 실제 API로 등록·상태·메모·사후 검토·조치 항목 업무·Runbook 노출·권한을 확인한다.
const seed = readSeed();
const serviceKey = `e2e-inc-${seed.run}`;
const title = `E2E 로그인 502 ${seed.run}`;
let serviceId = "";
let incidentId = "";

type Detail = {
  id: string;
  status: string;
  timeline: { kind: string; body: string }[];
  runbooks: { id: string; title: string }[];
};

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  // 영향 서비스는 API로 미리 만든다(소유자 = member). 화면 검증 대상은 사고 흐름이다.
  const response = await fetch(`${apiUrl}/api/v1/services`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${seed.admin.accessToken}`,
    },
    body: JSON.stringify({
      key: serviceKey,
      name: `E2E 인증 ${seed.run}`,
      tier: "TIER1",
      primaryOwnerId: seed.member.id,
    }),
  });
  expect(response.status).toBe(201);
  serviceId = ((await response.json()) as { id: string }).id;
});

test("팀원이 사고를 등록하고 메모·상태 변경을 타임라인에 남긴다", async ({
  page,
}) => {
  await signIn(page, seed.member.tokens);
  await page.goto("/me");
  await page
    .getByRole("navigation", { name: "조직" })
    .getByRole("link", { name: "운영" })
    .click();
  await page
    .getByRole("navigation", { name: "운영 메뉴" })
    .getByRole("link", { name: "장애" })
    .click();
  await expect(page).toHaveURL(/\/ops\?tab=incidents$/);
  await page.getByRole("button", { name: "사고 등록" }).first().click();
  const dialog = page.getByRole("dialog", { name: "사고 등록" });
  await dialog.getByLabel("제목").fill(title);
  await dialog.getByRole("button", { name: "등록" }).click();
  // 심각도는 기본값이 없다(D7-2).
  await expect(dialog.getByText("심각도를 고르세요.")).toBeVisible();
  await dialog.getByRole("radio", { name: /SEV2/ }).check();
  await dialog.getByRole("checkbox", { name: new RegExp(serviceKey) }).check();
  await dialog.getByRole("button", { name: "등록" }).click();
  await expect(page).toHaveURL(/\/incidents\/[0-9A-Z]{26}$/);
  incidentId = page.url().split("/").pop() ?? "";
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible();

  await page.getByLabel("타임라인 메모").fill("Hikari 풀 고갈 확인");
  await page.getByRole("button", { name: "메모 추가" }).click();
  await expect(page.getByText("Hikari 풀 고갈 확인")).toBeVisible();

  await page.getByRole("button", { name: "완화됨으로 변경" }).click();
  const status = page.getByRole("dialog", { name: "상태 변경" });
  await status.getByLabel("메모").fill("커넥션 풀 확장");
  await status.getByRole("button", { name: "완화됨으로 변경" }).click();
  await expect(status).toBeHidden();
  await expect(
    page.getByRole("button", { name: "해결됨으로 변경" }),
  ).toBeVisible();

  const detail = await apiGet<Detail>(
    `/api/v1/incidents/${incidentId}`,
    seed.member.tokens,
  );
  expect(detail.status).toBe("MITIGATED");
  expect(detail.timeline.map((entry) => entry.kind)).toEqual([
    "CREATED",
    "NOTE",
    "STATUS",
  ]);
});

test("사후 검토를 결정적 초안으로 시작하고 조치 항목을 업무로 만든다", async ({
  page,
}) => {
  await signIn(page, seed.member.tokens);
  await page.goto(`/incidents/${incidentId}?tab=postmortem`);
  await page.getByRole("button", { name: "사후 검토 시작" }).click();
  await expect(
    page
      .getByRole("region", { name: "요약" })
      .getByText(title, { exact: false }),
  ).toBeVisible();
  await page.getByLabel("새 조치 항목").fill("커넥션 풀 경보 추가");
  await page.getByRole("button", { name: "추가", exact: true }).click();
  await expect(page.getByText("커넥션 풀 경보 추가")).toBeVisible();
  await page.getByRole("button", { name: "업무 만들기" }).click();
  const dialog = page.getByRole("dialog", {
    name: "조치 항목으로 업무 만들기",
  });
  await dialog.getByRole("radio", { name: "팀 공용" }).check();
  await dialog.getByRole("button", { name: "업무 만들기" }).click();
  await expect(dialog).toBeHidden();
  const taskLink = page.locator(".action-item-task");
  await expect(taskLink).toBeVisible();

  const postmortem = await apiGet<{
    actionItems: { task: { id: string; accessible: boolean } | null }[];
  }>(`/api/v1/incidents/${incidentId}/postmortem`, seed.member.tokens);
  const task = postmortem.actionItems[0]?.task;
  expect(task?.accessible).toBe(true);
  const created = await apiGet<{ title: string; status: string }>(
    `/api/v1/tasks/${task?.id}`,
    seed.member.tokens,
  );
  expect(created).toMatchObject({
    title: "커넥션 풀 경보 추가",
    status: "BACKLOG",
  });
});

test("서비스에서 만든 Runbook을 게시하면 서비스와 사고 화면에 나온다", async ({
  page,
}) => {
  await signIn(page, seed.member.tokens);
  await page.goto(`/services/${serviceKey}?tab=runbooks`);
  await page.getByRole("button", { name: "Runbook 만들기" }).click();
  const dialog = page.getByRole("dialog", { name: "Runbook 만들기" });
  await dialog.getByLabel("제목").fill(`E2E 502 대응 ${seed.run}`);
  await dialog.getByRole("button", { name: "만들기" }).click();
  await expect(page).toHaveURL(/\/docs\/[0-9A-Z]{26}$/);
  // 본문 생략 시 종류별 기본 목차(D7-9).
  await expect(page.getByRole("heading", { name: "증상" })).toBeVisible();
  await page.getByLabel("문서 상태").selectOption("PUBLISHED");
  await expect(page.getByLabel("문서 상태")).toHaveValue("PUBLISHED");

  await page.goto(`/services/${serviceKey}?tab=runbooks`);
  await expect(
    page.getByRole("link", { name: `E2E 502 대응 ${seed.run}` }),
  ).toBeVisible();
  await page.goto(`/incidents/${incidentId}`);
  await expect(
    page
      .getByRole("region", { name: "Runbook" })
      .getByRole("link", { name: new RegExp(`E2E 502 대응 ${seed.run}`) }),
  ).toBeVisible();
  const detail = await apiGet<Detail>(
    `/api/v1/incidents/${incidentId}`,
    seed.member.tokens,
  );
  expect(detail.runbooks.map((doc) => doc.title)).toContain(
    `E2E 502 대응 ${seed.run}`,
  );
  expect(serviceId).not.toBe("");
});

test("편집 권한이 없는 팀원은 상태·수정은 못 하고 메모만 남긴다", async ({
  page,
}) => {
  await signIn(page, seed.outsider.tokens);
  await page.goto(`/incidents/${incidentId}`);
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible();
  for (const name of ["상태 변경", "수정", "삭제", "해결됨으로 변경"])
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  await expect(page.getByLabel("타임라인 메모")).toBeVisible();
  await page.goto(`/incidents/${incidentId}?tab=postmortem`);
  await expect(page.getByRole("button", { name: "업무 만들기" })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("새 조치 항목")).toHaveCount(0);
});
