import assert from "node:assert/strict";
import { test } from "node:test";
import { restorePlanFocus } from "./plan-focus";

test("moving and rolling back a row restores its action without scrolling", () => {
  const body = {};
  const doc = { body, activeElement: body };
  const options: FocusOptions[] = [];
  const action = () => {
    const button = {
      focus: (value?: FocusOptions) => {
        if (value) options.push(value);
        doc.activeElement = button;
      },
    };
    return button;
  };
  const original = action();
  const moved = action();
  restorePlanFocus(original, moved, doc);
  assert.equal(doc.activeElement, moved);
  doc.activeElement = body;
  const rolledBack = action();
  restorePlanFocus(moved, rolledBack, doc);
  assert.equal(doc.activeElement, rolledBack);
  assert.deepEqual(options, [{ preventScroll: true }, { preventScroll: true }]);
});

test("a user moving focus elsewhere during the request keeps that focus", () => {
  const other = {};
  const doc = { body: {}, activeElement: other };
  const target = {
    focus: () => {
      doc.activeElement = target;
    },
  };
  assert.equal(restorePlanFocus({}, target, doc), null);
  assert.equal(doc.activeElement, other);
});
