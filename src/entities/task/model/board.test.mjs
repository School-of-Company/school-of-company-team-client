import { test } from "node:test";
import assert from "node:assert/strict";
import {
  boardRequestParams,
  changeBoardFilter,
  sortTaskCards,
  taskMoveAt,
  boardTotal,
} from "./board.ts";

test("filter edits retain other axes and route context, deduplicate OR choices, and reset pagination", () => {
  const result = new URLSearchParams(
    changeBoardFilter("owner=me&view=compact&doneLimit=100", "status", [
      "DONE",
      "DONE",
      "IN_PROGRESS",
    ]),
  );
  assert.deepEqual(Object.fromEntries(result), {
    owner: "me",
    view: "compact",
    status: "DONE,IN_PROGRESS",
  });
});

test("board requests combine repeated OR parameters and exclude presentation-only parameters", () => {
  assert.deepEqual(
    Object.fromEntries(
      boardRequestParams(
        "scope=TEAM&owner=me&owner=none,me&sort=deadline&doneLimit=-1",
      ),
    ),
    { scope: "TEAM", owner: "me,none", doneLimit: "50" },
  );
});

const cards = [
  { id: "b", position: 20, priority: "P0", deadline: null },
  { id: "a", position: 10, priority: "P2", deadline: "2026-11-20" },
  { id: "c", position: 30, priority: "P1", deadline: "2026-11-19" },
].map((card) => ({ ...card, scope: "TEAM", projectId: null }));

test("sorting leaves the server cards intact and places missing deadlines last", () => {
  assert.deepEqual(
    sortTaskCards(cards, "deadline").map((card) => card.id),
    ["c", "a", "b"],
  );
  assert.deepEqual(
    cards.map((card) => card.id),
    ["b", "a", "c"],
  );
});

test("reordering excludes the moving card before calculating adjacent IDs", () => {
  assert.deepEqual(
    taskMoveAt({ cards, task: cards[1], status: "PLANNED", beforeId: "c" }),
    { status: "PLANNED", prevId: "b", nextId: "c" },
  );
});

test("empty-column moves have no neighbors", () => {
  assert.deepEqual(
    taskMoveAt({ cards: [], task: cards[1], status: "DONE", beforeId: null }),
    { status: "DONE", prevId: null, nextId: null },
  );
});

test("mixed-source boards never send another project's card as a position anchor", () => {
  const mixed = [
    ...cards,
    {
      ...cards[0],
      id: "foreign",
      scope: "PROJECT",
      projectId: "other",
      position: 25,
    },
  ];
  assert.deepEqual(
    taskMoveAt({
      cards: mixed,
      task: cards[1],
      status: "PLANNED",
      beforeId: "c",
    }),
    { status: "PLANNED", prevId: "b", nextId: "c" },
  );
});

test("total uses unique server counts rather than duplicate or truncated lane cards", () => {
  assert.equal(
    boardTotal({
      groups: [{ columns: { DONE: cards } }, { columns: { DONE: cards } }],
      counts: { BACKLOG: 2, PLANNED: 0, IN_PROGRESS: 1, REVIEW: 0, DONE: 70 },
    }),
    73,
  );
});
