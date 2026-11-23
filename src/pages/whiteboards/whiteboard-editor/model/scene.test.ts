import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  restoreOnto,
  selectedIds,
  sharedAppState,
  toCollaborators,
} from "./scene";

const el = (id: string, version: number, isDeleted = false) => ({
  id,
  version,
  versionNonce: 1,
  isDeleted,
});

test("restore outranks the current elements so other screens keep it", () => {
  const current = [el("a", 7), el("b", 3), el("gone", 2, true)];
  const revision = [el("a", 2), el("c", 1)];
  const result = restoreOnto(current, revision, () => 9);
  assert.deepEqual(result, [
    { id: "a", version: 8, versionNonce: 9, isDeleted: false },
    { id: "c", version: 2, versionNonce: 9, isDeleted: false },
    { id: "b", version: 4, versionNonce: 9, isDeleted: true },
  ]);
});

test("only the shared view settings are saved", () => {
  assert.deepEqual(
    sharedAppState({
      viewBackgroundColor: "#fff",
      gridSize: 20,
      zoom: { value: 2 },
      scrollX: 10,
      selectedElementIds: { a: true },
    }),
    { viewBackgroundColor: "#fff", gridSize: 20 },
  );
});

test("cursors become collaborators keyed by user", () => {
  const map = toCollaborators([
    {
      user: { id: "U1", username: "kim", name: "김", avatarUrl: null },
      x: 1,
      y: 2,
      selectedElementIds: ["a"],
      updatedAt: "2026-11-22T00:00:00Z",
    },
  ]);
  assert.deepEqual(map.get("U1"), {
    id: "U1",
    username: "김",
    avatarUrl: undefined,
    pointer: { x: 1, y: 2, tool: "pointer" },
    selectedElementIds: { a: true },
  });
});

test("selection is capped at what the server accepts", () => {
  const many = Object.fromEntries(
    Array.from({ length: 250 }, (_, i) => [`e${i}`, true]),
  );
  assert.equal(selectedIds(many).length, 200);
  assert.deepEqual(selectedIds({ a: true, b: false }), ["a"]);
});
