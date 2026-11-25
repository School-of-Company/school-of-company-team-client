import assert from "node:assert/strict";
import { test } from "node:test";
import {
  closeSprintRequest,
  decodeDestination,
  encodeDestination,
  nextSprintDates,
  nextSprintDefaults,
  NEXT_SPRINT_DESTINATION,
  seoulToday,
  sprintProgress,
} from "./types";

test("carry-over destinations round-trip and reject a missing id", () => {
  for (const destination of [
    { target: "SPRINT", sprintId: "S2" },
    { target: "BUCKET", bucketId: "B1" },
    { target: "NONE" },
  ] as const)
    assert.deepEqual(
      decodeDestination(encodeDestination(destination)),
      destination,
    );
  assert.equal(decodeDestination("SPRINT:"), null);
  assert.equal(decodeDestination("OTHER:1"), null);
});

test("close request sends only rows that differ from the default", () => {
  assert.deepEqual(
    closeSprintRequest("SPRINT:S2", {
      T1: "",
      T2: "SPRINT:S2",
      T3: "BUCKET:B1",
      T4: "NONE",
    }),
    {
      defaultCarryOver: { target: "SPRINT", sprintId: "S2" },
      overrides: [
        { taskId: "T3", target: "BUCKET", bucketId: "B1" },
        { taskId: "T4", target: "NONE" },
      ],
    },
  );
  assert.equal(closeSprintRequest("SPRINT:", {}), null);
});

test("progress treats missing statuses as zero", () => {
  assert.deepEqual(sprintProgress({ DONE: 2, IN_PROGRESS: 3 }), {
    total: 5,
    done: 2,
  });
  assert.deepEqual(sprintProgress({}), { total: 0, done: 0 });
});

test("next sprint starts after the latest open sprint, else today", () => {
  assert.deepEqual(
    nextSprintDates(
      [
        { endDate: "2026-11-27", status: "ACTIVE" },
        { endDate: "2026-12-11", status: "PLANNED" },
        { endDate: "2027-01-31", status: "CLOSED" },
      ],
      "2026-11-19",
    ),
    { startDate: "2026-12-12", endDate: "2026-12-25" },
  );
  assert.deepEqual(
    nextSprintDates(
      [{ endDate: "2026-11-01", status: "ACTIVE" }],
      "2026-11-19",
    ),
    {
      startDate: "2026-11-19",
      endDate: "2026-12-02",
    },
  );
});

test("today is computed in Asia/Seoul", () => {
  // 2026-11-19 15:30Z = 2026-11-20 00:30 KST
  assert.equal(seoulToday(new Date("2026-11-19T15:30:00Z")), "2026-11-20");
});

test("next sprint destination omits the sprint id (D14-d)", () => {
  assert.deepEqual(decodeDestination(NEXT_SPRINT_DESTINATION), {
    target: "SPRINT",
  });
  assert.equal(
    encodeDestination({ target: "SPRINT" }),
    NEXT_SPRINT_DESTINATION,
  );
  assert.deepEqual(
    closeSprintRequest(NEXT_SPRINT_DESTINATION, { T1: "NONE" }),
    {
      defaultCarryOver: { target: "SPRINT" },
      overrides: [{ taskId: "T1", target: "NONE" }],
    },
  );
});

test("next sprint defaults bump the last number and keep the length (D14-c)", () => {
  const range = { startDate: "2026-11-16", endDate: "2026-11-27" };
  assert.deepEqual(nextSprintDefaults({ name: "11월 4주차", ...range }), {
    name: "11월 5주차",
    startDate: "2026-11-28",
    endDate: "2026-12-09",
  });
  assert.equal(
    nextSprintDefaults({ name: "Sprint 9", ...range }).name,
    "Sprint 10",
  );
  assert.equal(
    nextSprintDefaults({ name: "출시 준비", ...range }).name,
    "출시 준비 다음",
  );
  assert.deepEqual(
    nextSprintDefaults({
      name: "하루",
      startDate: "2026-11-30",
      endDate: "2026-11-30",
    }),
    { name: "하루 다음", startDate: "2026-12-01", endDate: "2026-12-01" },
  );
});
