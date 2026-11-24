import assert from "node:assert/strict";
import { mock, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let pathname = "/projects/project";
mock.module("next/navigation", () => ({ usePathname: () => pathname }));
const { ProjectNav } = await import("./ProjectNav.tsx");
const project = {
  id: "project",
  key: "PR",
  name: "Project",
  description: null,
  visibility: "TEAM",
  archived: false,
  pmUserId: "pm",
  stage: "DEVELOPMENT",
  kind: "INTERNAL",
  workflow: "SPRINT",
  createdAt: "2026-11-18",
  members: [{ userId: "member", name: "Member", pm: false }],
  parts: [],
};

for (const [id, role, settingsVisible] of [
  ["reader", "MEMBER", false],
  ["member", "MEMBER", false],
  ["pm", "MEMBER", true],
  ["head", "LEAD", true],
]) {
  test(`project navigation settings visibility for ${id}`, () => {
    const html = renderToStaticMarkup(
      createElement(ProjectNav, { project, user: { id, role } }),
    );
    assert.equal(
      html.includes('href="/projects/project/settings"'),
      settingsVisible,
    );
    assert.match(html, /href="\/projects\/project"/);
    // Sprint·Milestone 은 조회 권한이 있으면 모두에게 보인다(관리 동작만 PM·헤드 어드민).
    assert.match(html, /href="\/projects\/project\/sprints"/);
    assert.match(html, /href="\/projects\/project\/milestones"/);
    // 링크도 조회 권한이 있으면 모두에게 보인다(쓰기는 카드의 canEdit·canDelete).
    assert.match(html, /href="\/projects\/project\/links"/);
    // 요구사항 탭도 조회 권한이 있으면 보인다(연락처·관리 동작은 서버가 PM·헤드 어드민에게만 준다).
    assert.match(html, /href="\/projects\/project\/requirements"/);
  });
}

test("sprint detail keeps the Sprint tab current", () => {
  pathname = "/projects/project/sprints/01SPRINT";
  const html = renderToStaticMarkup(
    createElement(ProjectNav, {
      project,
      user: { id: "member", role: "MEMBER" },
    }),
  );
  const anchors = html.match(/<a\b[^>]*>/g) ?? [];
  const current = anchors.filter((anchor) =>
    anchor.includes('aria-current="page"'),
  );
  assert.equal(current.length, 1);
  assert.match(current[0], /href="\/projects\/project\/sprints"/);
});

test("kanban projects hide the Sprint tab unless the user is already there", () => {
  const kanban = { ...project, workflow: "KANBAN" };
  const render = () =>
    renderToStaticMarkup(
      createElement(ProjectNav, {
        project: kanban,
        user: { id: "member", role: "MEMBER" },
      }),
    );
  pathname = "/projects/project";
  assert.doesNotMatch(render(), /href="\/projects\/project\/sprints"/);
  assert.match(render(), /href="\/projects\/project\/milestones"/);
  pathname = "/projects/project/sprints/01SPRINT";
  assert.match(render(), /href="\/projects\/project\/sprints"/);
});

test("project settings route identifies its current destination", () => {
  pathname = "/projects/project/settings";
  const html = renderToStaticMarkup(
    createElement(ProjectNav, { project, user: { id: "pm", role: "MEMBER" } }),
  );
  const anchors = html.match(/<a\b[^>]*>/g) ?? [];
  assert.equal(
    anchors
      .find((anchor) => anchor.includes('href="/projects/project/settings"'))
      ?.includes('aria-current="page"'),
    true,
  );
  assert.equal(
    anchors
      .find((anchor) => anchor.includes('href="/projects/project"'))
      ?.includes("aria-current"),
    false,
  );
});
