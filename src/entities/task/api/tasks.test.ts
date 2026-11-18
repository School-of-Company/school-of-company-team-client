import { test } from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { taskKeys, taskQueries } from "./tasks";

test("equivalent board filters share cached data regardless of URL and OR value order", () => {
  const client = new QueryClient();
  const first = taskQueries.board(
    "scope=TEAM&owner=b,a&status=DONE,REVIEW",
    false,
  );
  const reordered = taskQueries.board(
    "status=REVIEW,DONE&owner=a&owner=b&scope=TEAM&sort=deadline",
    false,
  );
  const board = {
    groups: [],
    counts: { BACKLOG: 0, PLANNED: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 },
  };
  client.setQueryData(first.queryKey, board);
  assert.deepEqual(client.getQueryData(reordered.queryKey), board);
  assert.equal(
    client.getQueryData(
      taskQueries.board("scope=TEAM&owner=a,b&status=REVIEW,DONE", true)
        .queryKey,
    ),
    undefined,
  );
  client.clear();
});

test("project board predicate matches only boards filtered to that project", () => {
  const key = (search: string, personal = false) =>
    taskQueries.board(search, personal).queryKey;
  assert.equal(
    taskKeys.isProjectBoard(key("scope=PROJECT&project=WEB"), "WEB"),
    true,
  );
  assert.equal(
    taskKeys.isProjectBoard(key("project=APP,WEB", true), "WEB"),
    true,
  );
  assert.equal(taskKeys.isProjectBoard(key("project=WEBX"), "WEB"), false);
  assert.equal(taskKeys.isProjectBoard(key("scope=TEAM"), "WEB"), false);
  assert.equal(taskKeys.isProjectBoard(taskKeys.detail("1"), "WEB"), false);
});
