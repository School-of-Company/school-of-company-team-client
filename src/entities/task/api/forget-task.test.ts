import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { forgetTask } from "./tasks";

test("업무가 사라지면 업무 쿼리와 화면에 없는 목록 캐시를 지워 돌아와도 옛 목록을 그리지 않는다", () => {
  const client = new QueryClient();
  const keys = [
    ["tasks", "detail", "t1"],
    ["tasks", "board", false, "doneLimit=50"],
    ["projects", "p1"],
    ["home"],
    ["me", "github", "review-requests"],
    ["members"],
  ];
  for (const key of keys) client.setQueryData(key, { cached: true });
  const unrelated = ["identity", "me"];
  client.setQueryData(unrelated, { id: "u1" });

  forgetTask(client);

  for (const key of keys)
    assert.equal(client.getQueryData(key), undefined, key.join("/"));
  assert.deepEqual(client.getQueryData(unrelated), { id: "u1" });
});
