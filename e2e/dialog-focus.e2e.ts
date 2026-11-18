import { expect, test } from "@playwright/test";
import { apiUrl, readSeed, signIn, type Tokens } from "./support";

// 대화상자를 닫으면(호출부가 조건부 렌더로 언마운트하는 경우 포함) 포커스가 연 버튼으로 돌아오고,
// 연 요소가 사라졌으면 body 가 아니라 본문(main)으로 간다. 격리 backend 실제 API.
const seed = readSeed();
// `--repeat-each` 로 여러 번 돌려도 이름이 겹치지 않게(Sprint·Milestone 이름은 프로젝트 안에서 유일).
const unique = () => `${seed.run}-${Date.now().toString(36)}`;

async function api<T>(
  method: string,
  path: string,
  tokens: Tokens,
  body?: unknown,
) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${tokens.accessToken}`,
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status}`);
  return (response.status === 204 ? null : await response.json()) as T;
}

test("보드 업무 등록 대화상자를 Esc·취소로 닫으면 업무 등록 버튼으로 돌아온다", async ({
  page,
}) => {
  await signIn(page, seed.member.tokens);
  await page.goto(`/projects/${seed.project.id}`);
  const trigger = page.getByRole("button", { name: "업무 등록" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "업무 등록" });
  await expect(dialog).toBeVisible();
  // 열리면 포커스가 대화상자 안으로 들어간다(모달).
  await expect(dialog.locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "취소" }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("Sprint 종료 대화상자를 닫으면 종료 버튼으로 돌아온다", async ({
  page,
}) => {
  const base = `/api/v1/projects/${seed.project.id}/sprints`;
  const sprint = await api<{ id: string }>("POST", base, seed.admin, {
    name: `포커스 ${unique()}`,
    startDate: "2026-11-16",
    endDate: "2026-11-27",
  });
  await api("POST", `${base}/${sprint.id}/start`, seed.admin);
  await signIn(page, seed.admin);
  await page.goto(`/projects/${seed.project.id}/sprints/${sprint.id}`);
  const trigger = page.getByRole("button", { name: "종료", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("미완료 업무 기본 대상")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  // 같은 Sprint 를 다음 실행에서 다시 쓰지 않도록 닫아 둔다.
  await api("POST", `${base}/${sprint.id}/close`, seed.admin, {
    defaultCarryOver: { target: "NONE" },
  });
});

test("연 요소가 사라지면(삭제한 Milestone 행) 포커스는 body 가 아니라 본문으로 간다", async ({
  page,
}) => {
  const name = `포커스 ${unique()}`;
  await api(
    "POST",
    `/api/v1/projects/${seed.project.id}/milestones`,
    seed.admin,
    {
      name,
    },
  );
  await signIn(page, seed.admin);
  await page.goto(`/projects/${seed.project.id}/milestones`);
  const row = page.getByRole("button", { name: new RegExp(name) });
  await row.focus();
  await page.keyboard.press("Enter");
  const panel = page.getByRole("dialog", { name });
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "삭제" }).press("Enter");
  await panel
    .getByRole("group", { name: "삭제 확인" })
    .getByRole("button", { name: "삭제" })
    .press("Enter");
  await expect(panel).toBeHidden();
  await expect(row).toHaveCount(0);
  await expect(page.locator("main#main-content")).toBeFocused();
});
