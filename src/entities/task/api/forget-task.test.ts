import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { forgetTask, rememberTask } from "./tasks";

const board = () => ({
  groups: [{ columns: { PLANNED: [{ id: "gone" }, { id: "kept" }] } }],
});

test("화면 밖 목록은 지우고, 화면에 있는 목록은 그 업무만 빼고 데이터를 둔 채 다시 받는다", () => {
  const client = new QueryClient();
  const inactive = [
    ["tasks", "board", false, "x"],
    ["projects", "p1"],
    ["home"],
    ["me", "github", "review-requests"],
    ["members"],
    ["projects", "p1", "github-repositories"],
    ["settings-repositories", "p1"],
    ["settings-installable-repositories", "p1"],
  ];
  for (const key of inactive) client.setQueryData(key, board());
  const activeKey = ["tasks", "board", true, "y"];
  client.setQueryData(activeKey, board());
  const project = ["projects", "p2"];
  client.setQueryData(project, { id: "p2", name: "프로젝트" });
  // 화면에 붙어 있는 쿼리(관찰자 있음). 응답을 지어내지 않도록 queryFn은 기존 값을 돌려준다.
  for (const key of [activeKey, project])
    new QueryObserver(client, {
      queryKey: key,
      queryFn: () => client.getQueryData(key),
      staleTime: Infinity,
    }).subscribe(() => undefined);

  assert.equal(forgetTask(client, "gone"), true);

  for (const key of inactive)
    assert.equal(client.getQueryData(key), undefined, key.join("/"));
  assert.deepEqual(client.getQueryData(activeKey), {
    groups: [{ columns: { PLANNED: [{ id: "kept" }] } }],
  });
  // 업무를 담지 않는 프로젝트 상세는 비우지 않는다(보드가 로딩으로 바뀌지 않게).
  assert.deepEqual(client.getQueryData(project), {
    id: "p2",
    name: "프로젝트",
  });
  assert.equal(client.getQueryState(project)?.status, "success");
});

test("같은 업무는 한 번만 정리하고, 다시 읽히면 다음에 다시 정리한다", () => {
  const client = new QueryClient();
  assert.equal(forgetTask(client, "t1"), true);
  assert.equal(forgetTask(client, "t1"), false);
  assert.equal(forgetTask(client, "t2"), true);
  rememberTask(client, "t1");
  assert.equal(forgetTask(client, "t1"), true);
});

test("404가 난 그 업무의 상세·GitHub 쿼리는 건드리지 않는다(다시 받지 않게)", () => {
  const client = new QueryClient();
  const detail = ["tasks", "detail", "t1"];
  const github = ["tasks", "github", "t1"];
  client.setQueryData(detail, { id: "t1" });
  client.setQueryData(github, { links: [] });
  forgetTask(client, "t1");
  assert.deepEqual(client.getQueryData(detail), { id: "t1" });
  assert.deepEqual(client.getQueryData(github), { links: [] });
});
