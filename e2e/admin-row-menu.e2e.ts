import { test, expect } from "@playwright/test";

// 사용자 관리 표의 '관리' popover 는 top layer 에 뜬다. 좌표가 없으면 화면 왼쪽 위(사이드바 위)에 붙는다.
const users = Array.from({ length: 30 }, (_, index) => ({
  id: `user-${index}`,
  username: `user${index}`,
  name: `대기 사용자 ${index}`,
  role: "MEMBER",
  status: "PENDING",
  approvedAt: null,
  createdAt: "2026-11-24T00:00:00Z",
}));

for (const width of [1440, 390]) {
  test(`at ${width}px the admin row menu opens next to its button`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      sessionStorage.setItem("soc.access-token", "fixture");
      sessionStorage.setItem("soc.refresh-token", "fixture");
    });
    await page.route("**/api/v1/**", async (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname === "/api/v1/me")
        await route.fulfill({
          json: {
            id: "lead",
            username: "lead",
            name: "헤드 어드민",
            major: null,
            role: "LEAD",
            status: "ACTIVE",
            createdAt: "2026-11-24T00:00:00Z",
            githubId: null,
            githubLogin: null,
            discordLinked: true,
            discordUsername: null,
          },
        });
      else if (pathname === "/api/v1/admin/users")
        await route.fulfill({ json: users });
      else await route.fulfill({ json: [] });
    });
    await page.goto("/admin");
    const name = users[2].name;
    const button = page.getByRole("button", { name: `${name} 관리` });
    await button.scrollIntoViewIfNeeded();
    const menu = page.locator(`#admin-actions-${users[2].id}`);
    // 보이기 직전(beforetoggle, 훅의 리스너 다음)에 좌표가 이미 정해져 있어야 첫 프레임부터 버튼 옆에 그려진다.
    await menu.evaluate((element) => {
      element.addEventListener(
        "beforetoggle",
        () => {
          element.dataset.firstFrame = `${parseFloat(element.style.top)},${parseFloat(element.style.left)}`;
        },
        { once: true },
      );
    });
    await button.click();
    await expect(
      menu.getByRole("button", { name: `${name} 가입 승인` }),
    ).toBeVisible();
    const near = async (box: { x: number; y: number }, height: number) => {
      const anchor = (await button.boundingBox())!;
      // 아래 또는 위로 버튼에 붙는다(간격 4px, 허용 8px).
      const gap = Math.min(
        Math.abs(box.y - (anchor.y + anchor.height)),
        Math.abs(anchor.y - (box.y + height)),
      );
      expect(gap).toBeLessThanOrEqual(8);
    };
    await expect(async () => {
      const anchor = (await button.boundingBox())!;
      const box = (await menu.boundingBox())!;
      await near(box, box.height);
      // 가로는 버튼과 겹치고 화면 안에 있다.
      expect(box.x).toBeLessThanOrEqual(anchor.x + anchor.width);
      expect(box.x + box.width).toBeGreaterThanOrEqual(anchor.x);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      const [top, left] = (await menu.getAttribute("data-first-frame"))!
        .split(",")
        .map(Number);
      await near({ x: left, y: top }, box.height);
    }).toPass({ timeout: 5000 });

    // Esc 로 닫히고 포커스가 버튼으로 돌아온다.
    await menu.getByRole("button", { name: `${name} 가입 승인` }).focus();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
    // 바깥 클릭으로도 닫힌다.
    await button.click();
    await expect(menu).toBeVisible();
    await page.mouse.click(width - 4, 896);
    await expect(menu).toBeHidden();
    // 버튼이 화면 밖으로 스크롤되면 가장자리에 붙어 남지 않고 닫힌다.
    await button.click();
    await expect(menu).toBeVisible();
    await page.mouse.wheel(0, 3000);
    await expect(menu).toBeHidden();
  });
}
