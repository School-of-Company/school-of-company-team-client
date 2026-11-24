import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dateBounds,
  dateErrors,
  overlapReason,
  overlapping,
  taskErrorMessage,
} from "./rules";

const today = "2026-11-24";

test("new tasks cannot start or end in the past", () => {
  assert.deepEqual(dateBounds({ today, creating: true, startDate: "" }), {
    startMin: today,
    deadlineMin: today,
  });
  const errors = dateErrors({
    today,
    creating: true,
    startDate: "2026-11-23",
    deadline: "2026-11-01",
  });
  assert.ok(errors.startDate);
  assert.ok(errors.deadline);
});

test("deadline minimum follows a later start date", () => {
  assert.equal(
    dateBounds({ today, creating: true, startDate: "2026-12-05" }).deadlineMin,
    "2026-12-05",
  );
  // 지난 시작일(수정 화면)이면 하한은 오늘이다.
  assert.equal(
    dateBounds({ today, creating: false, startDate: "2026-11-01" }).deadlineMin,
    today,
  );
  assert.equal(
    dateBounds({ today, creating: false, startDate: "" }).startMin,
    undefined,
  );
});

test("start after deadline is rejected, same day is fine", () => {
  assert.match(
    dateErrors({
      today,
      creating: true,
      startDate: "2026-12-10",
      deadline: "2026-12-01",
    }).deadline ?? "",
    /시작일/,
  );
  assert.deepEqual(
    dateErrors({
      today,
      creating: true,
      startDate: "2026-12-01",
      deadline: "2026-12-01",
    }),
    {},
  );
});

test("editing keeps an existing past deadline but not a new past pick", () => {
  const base = {
    today,
    creating: false,
    startDate: "2026-11-01",
    initialDeadline: "2026-11-10",
  };
  assert.deepEqual(dateErrors({ ...base, deadline: "2026-11-10" }), {});
  assert.ok(dateErrors({ ...base, deadline: "2026-11-12" }).deadline);
  assert.deepEqual(dateErrors({ ...base, deadline: "" }), {});
});

test("an assignee is blocked from the reviewer list and vice versa", () => {
  const assignees = ["A", "B"];
  const reviewers = ["C"];
  assert.equal(overlapReason("A", reviewers, assignees, "담당자"), "담당자");
  assert.equal(overlapReason("D", reviewers, assignees, "담당자"), undefined);
  assert.equal(overlapReason("C", assignees, reviewers, "리뷰어"), "리뷰어");
  // 예전 데이터처럼 양쪽에 다 들어 있으면 해제할 수 있게 막지 않는다.
  assert.equal(overlapReason("A", ["A"], assignees, "담당자"), undefined);
  assert.deepEqual(overlapping(assignees, ["B", "C"]), ["B"]);
});

test("server overlap and start date errors read as form messages", () => {
  const people = [{ id: "U1", name: "박하민" }];
  assert.equal(
    taskErrorMessage(
      {
        code: "TASK_REVIEWER_IS_ASSIGNEE",
        message: "x",
        details: { userId: "U1" },
      },
      people,
    ),
    "박하민님은 담당자라서 리뷰어로 지정할 수 없어요.",
  );
  assert.match(
    taskErrorMessage(
      {
        code: "VALIDATION_ERROR",
        message: "x",
        details: { field: "startDate" },
      },
      people,
    ),
    /시작일/,
  );
  assert.equal(
    taskErrorMessage({ code: "OTHER", message: "원래 문구" }, people),
    "원래 문구",
  );
});
