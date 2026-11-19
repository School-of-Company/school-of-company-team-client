import assert from "node:assert/strict";
import { test } from "node:test";
import type { Member } from "../api/members";
import { projectRole, readSort, sortMembers } from "./members";

const member = (
  name: string,
  inProgress: number,
  reviewing: number,
): Member => ({
  id: name,
  username: name,
  name,
  major: null,
  avatarUrl: null,
  role: "MEMBER",
  projects: [],
  load: { inProgress, reviewing },
  connections: null,
});

test("load sort puts the busiest first and keeps server order on ties", () => {
  const list = [member("가", 1, 0), member("나", 2, 1), member("다", 0, 1)];
  assert.deepEqual(
    sortMembers(list, "load").map((item) => item.name),
    ["나", "가", "다"],
  );
  assert.equal(sortMembers(list, "name"), list);
});

test("unknown sort values fall back to name order", () => {
  assert.equal(readSort(null), "name");
  assert.equal(readSort("weird"), "name");
  assert.equal(readSort("load"), "load");
});

test("project role lists PM, then parts with leaders marked", () => {
  const base = { projectId: "p", key: "HUB", name: "Hub" };
  assert.equal(projectRole({ ...base, pm: false, parts: [] }), "참여");
  assert.equal(
    projectRole({
      ...base,
      pm: true,
      parts: [
        { id: "a", name: "서버", leader: true },
        { id: "b", name: "웹", leader: false },
      ],
    }),
    "PM, 서버 리더, 웹",
  );
});
