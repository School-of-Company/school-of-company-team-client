import assert from "node:assert/strict";
import { test } from "node:test";
import {
  availableTypes,
  isSearchShortcut,
  itemHref,
  itemMeta,
  moveActive,
  visibleGroups,
  type SearchItem,
  type SearchResponse,
} from "./search";

const task: SearchItem = {
  type: "TASK",
  id: "T142",
  title: "로그인 리다이렉트 수정",
  key: "HUB-142",
  status: "IN_PROGRESS",
  context: "HUB",
  projectId: "P1",
  updatedAt: "2026-11-19T09:40:00+09:00",
};
const response: SearchResponse = {
  query: "로그인",
  groups: [
    { type: "TASK", hasMore: true, items: [task] },
    {
      type: "DOCUMENT",
      hasMore: false,
      items: [{ ...task, type: "DOCUMENT" }],
    },
    {
      type: "SERVICE",
      hasMore: false,
      items: [
        {
          ...task,
          type: "SERVICE",
          id: "V1",
          key: "auth-gw",
          status: null,
          context: "TIER1",
          projectId: null,
        },
      ],
    },
    { type: "SPRINT", hasMore: false, items: [] },
  ],
  unavailableTypes: ["SPRINT"],
};

test("only non-empty groups of types the screen can open are shown, in server order", () => {
  assert.deepEqual(
    visibleGroups(response).map((group) => group.type),
    ["TASK", "SERVICE"],
  );
  assert.deepEqual(
    visibleGroups(response, "SERVICE").map((group) => group.type),
    ["SERVICE"],
  );
  assert.deepEqual(visibleGroups(undefined), []);
});

test("types the server cannot search yet are left out of the filter without notice", () => {
  assert.deepEqual(availableTypes(response), ["TASK", "SERVICE"]);
  assert.deepEqual(availableTypes(undefined), ["TASK", "SERVICE", "SPRINT"]);
});

test("results link to their own screens", () => {
  assert.equal(itemHref(task), "/tasks/T142");
  assert.equal(
    itemHref({ ...task, type: "SERVICE", key: "auth-gw" }),
    "/services/auth-gw",
  );
  assert.equal(
    itemHref({ ...task, type: "SPRINT", id: "S1" }),
    "/projects/P1/sprints/S1",
  );
  assert.equal(itemHref({ ...task, type: "INCIDENT" }), null);
});

test("meta shows readable status and scope", () => {
  assert.deepEqual(itemMeta(task), ["진행 중", "HUB"]);
  assert.deepEqual(
    itemMeta({ ...task, key: null, context: "PERSONAL", projectId: null }),
    ["진행 중", "개인"],
  );
  assert.deepEqual(
    itemMeta({ ...task, type: "SERVICE", status: null, context: "TIER1" }),
    ["1등급"],
  );
  assert.deepEqual(
    itemMeta({ ...task, type: "SPRINT", status: "ACTIVE", context: "HUB" }),
    ["진행 중", "HUB"],
  );
});

test("arrow keys move through all results and wrap", () => {
  assert.equal(moveActive(0, 1, 3), 1);
  assert.equal(moveActive(2, 1, 3), 0);
  assert.equal(moveActive(0, -1, 3), 2);
  assert.equal(moveActive(-1, -1, 3), 2);
  assert.equal(moveActive(0, 1, 0), -1);
});

test("Cmd+K and Ctrl+K open search; other combinations and IME composition do not", () => {
  const key = {
    key: "k",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
  };
  assert.ok(isSearchShortcut({ ...key, metaKey: true }));
  assert.ok(isSearchShortcut({ ...key, ctrlKey: true, key: "K" }));
  assert.ok(!isSearchShortcut(key));
  assert.ok(!isSearchShortcut({ ...key, ctrlKey: true, shiftKey: true }));
  assert.ok(!isSearchShortcut({ ...key, metaKey: true, isComposing: true }));
});
