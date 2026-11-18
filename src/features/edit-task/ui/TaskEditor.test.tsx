import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ProjectDetail } from "@/entities/project";
import { TaskEditor } from "./TaskEditor";

const project: ProjectDetail = {
  id: "P",
  key: "HUB",
  name: "Hub",
  description: null,
  archived: false,
  visibility: "TEAM",
  pmUserId: null,
  createdAt: "2026-11-19T00:00:00Z",
  members: [],
  parts: [],
};
const buckets = [
  { id: "B1", name: "이번 주기", position: 0, archived: false, createdAt: "" },
  { id: "B9", name: "지난 주기", position: 1, archived: true, createdAt: "" },
];
const render = (initialBucketId?: string) =>
  renderToStaticMarkup(
    <TaskEditor
      scope="PROJECT"
      project={project}
      buckets={buckets}
      initialBucketId={initialBucketId}
      candidates={[]}
      onCreate={async () => {}}
      onCancel={() => {}}
    />,
  );
const selected = (html: string) =>
  html
    .split('name="planningBucketId"')[1]
    ?.split("</select>")[0]
    .match(/<option value="([^"]*)" selected="">/)?.[1];

test("a bucket lane's add button opens the editor on that active bucket", () => {
  assert.equal(selected(render("B1")), "B1");
});

test("an archived or unknown bucket never becomes the new task's default", () => {
  for (const id of ["B9", "GONE", undefined]) {
    const html = render(id);
    assert.equal(selected(html), "");
    assert.doesNotMatch(html, /지난 주기/);
  }
});
