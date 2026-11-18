import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { forgetTask } from "./tasks";

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

  assert.equal(forgetTask(client, "gone", 1_000), true);

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

test("같은 404 응답이면 다시 받기는 한 번만, 새 404 응답이면 다시 정리한다", () => {
  const client = new QueryClient();
  assert.equal(forgetTask(client, "t1", 1_000), true);
  assert.equal(forgetTask(client, "t1", 1_000), false);
  assert.equal(forgetTask(client, "t2", 1_000), true);
  // 공개로 돌아왔다가 다시 비공개가 되어 받은 새 404.
  assert.equal(forgetTask(client, "t1", 2_000), true);
});

test("다시 받기를 건너뛰어도 목록 제외는 매번 한다", () => {
  const client = new QueryClient();
  const key = ["tasks", "board", true, "y"];
  new QueryObserver(client, {
    queryKey: key,
    queryFn: board,
    staleTime: Infinity,
  }).subscribe(() => undefined);
  forgetTask(client, "gone", 1_000);
  // 다시 공개가 되어 목록에 돌아왔다(같은 화면, 같은 QueryClient).
  client.setQueryData(key, board());
  assert.equal(forgetTask(client, "gone", 1_000), false);
  assert.deepEqual(client.getQueryData(key), {
    groups: [{ columns: { PLANNED: [{ id: "kept" }] } }],
  });
});

test("404가 난 그 업무의 상세·GitHub 쿼리는 건드리지 않는다(다시 받지 않게)", () => {
  const client = new QueryClient();
  const detail = ["tasks", "detail", "t1"];
  const github = ["tasks", "github", "t1"];
  client.setQueryData(detail, { id: "t1" });
  client.setQueryData(github, { links: [] });
  forgetTask(client, "t1", 1_000);
  assert.deepEqual(client.getQueryData(detail), { id: "t1" });
  assert.deepEqual(client.getQueryData(github), { links: [] });
});
