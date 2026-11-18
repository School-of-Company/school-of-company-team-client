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
  });
}

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
