import { expect, test } from "@playwright/test";
import { apiGet, apiUrl, readSeed, signIn } from "./support";

// 단계 6 서비스 카탈로그: 실제 API로 생성·의존 추가·권한별 편집 노출을 확인한다.
const seed = readSeed();
const key = `e2e-${seed.run}`;
const upstreamKey = `e2e-db-${seed.run}`;

type Summary = {
  id: string;
  key: string;
  owners: { userId: string; role: string }[];
};

test.describe.configure({ mode: "serial" });

test("헤드 어드민이 서비스를 만들고 의존관계를 추가한다", async ({ page }) => {
  // 의존 대상은 API로 미리 만든다(화면 검증 대상은 생성 폼과 의존 추가).
  const created = await fetch(`${apiUrl}/api/v1/services`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${seed.admin.accessToken}`,
    },
    body: JSON.stringify({
      key: upstreamKey,
      name: `E2E DB ${seed.run}`,
      primaryOwnerId: seed.member.id,
    }),
  });
  expect(created.status).toBe(201);

  await signIn(page, seed.admin);
  await page.goto("/me");
  await page
    .getByRole("navigation", { name: "조직" })
    .getByRole("link", { name: "서비스" })
    .click();
  await expect(page).toHaveURL(/\/services$/);
  await page.getByRole("button", { name: "새 서비스" }).first().click();
  const dialog = page.getByRole("dialog", { name: "새 서비스" });
  await dialog.getByLabel("키").fill(key);
  await dialog.getByLabel("이름").fill(`E2E 서비스 ${seed.run}`);
  await dialog
    .getByLabel("주 소유자")
    .selectOption({ label: seed.member.name });
  await dialog.getByRole("button", { name: "서비스 만들기" }).click();
  await expect(page).toHaveURL(new RegExp(`/services/${key}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: `E2E 서비스 ${seed.run}` }),
  ).toBeVisible();

  await page.getByRole("button", { name: "의존 추가" }).click();
  const dep = page.getByRole("dialog", { name: "의존 추가" });
  await dep
    .getByLabel("대상 서비스")
    .selectOption({ label: `E2E DB ${seed.run} (${upstreamKey})` });
  await dep.getByLabel("종류").selectOption("DATA");
  await dep.getByRole("button", { name: "추가" }).click();
  await expect(dep).toBeHidden();

  const services = await apiGet<Summary[]>("/api/v1/services", seed.admin);
  const service = services.find((item) => item.key === key);
  expect(service?.owners).toEqual([
    expect.objectContaining({ userId: seed.member.id, role: "PRIMARY" }),
  ]);
  const graph = await apiGet<{ edges: { from: string; kind: string }[] }>(
    "/api/v1/services/dependency-graph",
    seed.admin,
  );
  expect(graph.edges).toContainEqual(
    expect.objectContaining({ from: service?.id, kind: "DATA" }),
  );

  await page.goto("/services?view=graph");
  await expect(
    page.getByRole("link", {
      name: new RegExp(`E2E 서비스 ${seed.run} \\(${key}\\)`),
    }),
  ).toBeVisible();
});

test("소유자는 편집할 수 있고 다른 팀원은 조회만 한다", async ({ browser }) => {
  const owner = await browser.newPage();
  await signIn(owner, seed.member.tokens);
  await owner.goto(`/services/${key}`);
  await expect(
    owner.getByRole("button", { name: "수정", exact: true }),
  ).toBeVisible();
  await expect(owner.getByRole("button", { name: "아카이브" })).toHaveCount(0);
  await owner.close();

  const outsider = await browser.newPage();
  await signIn(outsider, seed.outsider.tokens);
  await outsider.goto(`/services/${key}`);
  await expect(
    outsider.getByRole("heading", { level: 1, name: `E2E 서비스 ${seed.run}` }),
  ).toBeVisible();
  for (const name of ["수정", "의존 추가", "저장소 연결", "소유자 변경"])
    await expect(
      outsider.getByRole("button", { name, exact: true }),
    ).toHaveCount(0);
  await outsider.goto("/services");
  await expect(outsider.getByRole("button", { name: "새 서비스" })).toHaveCount(
    0,
  );
  await outsider.close();
});
