import { test } from "node:test";
import { strict as assert } from "node:assert";
import { groupTemplates } from "./templates";
import type { WhiteboardTemplate } from "./types";

const template = (
  id: string,
  category: string,
  source: "BUILT_IN" | "TEAM" = "BUILT_IN",
) =>
  ({
    id,
    source,
    name: id,
    description: "",
    category,
    scene: { elements: [] },
  }) as unknown as WhiteboardTemplate;

test("groups by category order, keeps server order inside, drops empty groups", () => {
  const groups = groupTemplates([
    template("FLOWCHART", "DIAGRAM"),
    template("BLANK", "BASIC"),
    template("RETRO", "MEETING"),
    template("ERD", "DIAGRAM"),
    template("01TEAM", "DIAGRAM", "TEAM"),
  ]);
  assert.deepEqual(
    groups.map((group) => group.label),
    ["기본", "회의", "다이어그램"],
  );
  assert.deepEqual(
    groups[2]!.templates.map((item) => item.id),
    ["FLOWCHART", "ERD", "01TEAM"],
  );
});

test("unknown category falls back to 기본", () => {
  const groups = groupTemplates([template("NEW", "SOMETHING")]);
  assert.deepEqual(
    groups.map((group) => group.category),
    ["BASIC"],
  );
});
