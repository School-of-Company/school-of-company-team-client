import assert from "node:assert/strict";
import { test } from "node:test";
import {
  overviewFilterFrom,
  overviewFilterQuery,
  successRate,
} from "./overview";

test("운영 개요 필터는 주소와 오간다", () => {
  const filter = overviewFilterFrom(
    new URLSearchParams(
      "tab=automation&scope=TEAM&enabled=false&autoDisabled=true&event=TASK_BLOCKED",
    ),
  );
  assert.deepEqual(filter, {
    scope: "TEAM",
    projectId: "",
    enabled: "false",
    autoDisabled: true,
    event: "TASK_BLOCKED",
    action: "",
  });
  assert.equal(
    overviewFilterQuery(filter, { tab: "automation" }),
    "tab=automation&scope=TEAM&enabled=false&autoDisabled=true&event=TASK_BLOCKED",
  );
  assert.equal(
    overviewFilterFrom(new URLSearchParams("scope=ALL&enabled=yes")).scope,
    "",
  );
  assert.equal(
    overviewFilterFrom(new URLSearchParams("enabled=yes")).enabled,
    "",
  );
});

test("7일 성공률은 실행이 없으면 비운다", () => {
  assert.equal(successRate({ succeeded7d: 0, failed7d: 0 }), null);
  assert.equal(successRate({ succeeded7d: 3, failed7d: 1 }), 75);
});
