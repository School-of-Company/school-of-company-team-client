import { test } from "node:test";
import { strict as assert } from "node:assert";
import { prepareInsert } from "./scene";

const counter = () => {
  let n = 0;
  return () => `new-${++n}`;
};

test("prepareInsert renames ids and keeps references between inserted elements", () => {
  const out = prepareInsert(
    [
      {
        id: "box",
        x: 0,
        y: 0,
        groupIds: ["g"],
        boundElements: [{ id: "label" }, { id: "gone" }],
      },
      { id: "label", x: 5, y: 5, groupIds: ["g"], containerId: "box" },
      {
        id: "arrow",
        x: 10,
        y: 10,
        startBinding: { elementId: "box" },
        endBinding: { elementId: "outside" },
      },
      { id: "dead", x: 0, y: 0, isDeleted: true },
    ],
    100,
    50,
    counter(),
  );
  assert.equal(out.length, 3);
  const [box, label, arrow] = out as Record<string, unknown>[];
  assert.notEqual(box!.id, "box");
  assert.equal(label!.containerId, box!.id);
  assert.deepEqual(box!.boundElements, [{ id: label!.id }]);
  assert.deepEqual(arrow!.startBinding, { elementId: box!.id });
  assert.equal(arrow!.endBinding, null);
  assert.deepEqual(box!.groupIds, label!.groupIds);
  assert.notDeepEqual(box!.groupIds, ["g"]);
  assert.equal(box!.x, 100);
  assert.equal(label!.y, 55);
});

test("inserting the same elements twice never repeats an id", () => {
  const source = [{ id: "a", x: 0, y: 0 }];
  const next = counter();
  const first = prepareInsert(source, 0, 0, next);
  const second = prepareInsert(source, 0, 0, next);
  assert.notEqual(first[0]!.id, second[0]!.id);
});
