import { test } from "node:test";
import { strict as assert } from "node:assert";
import { dismissStartGuide, startGuideDismissed } from "./guide";

const memory = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
};

test("start guide is remembered per user", () => {
  const storage = memory();
  assert.equal(startGuideDismissed("u1", storage), false);
  dismissStartGuide("u1", storage);
  assert.equal(startGuideDismissed("u1", storage), true);
  assert.equal(startGuideDismissed("u2", storage), false);
});

test("broken storage never throws and hides the guide", () => {
  const broken = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  assert.equal(startGuideDismissed("u1", broken), true);
  assert.doesNotThrow(() => dismissStartGuide("u1", broken));
});
