import assert from "node:assert/strict";
import { test } from "node:test";
import { restoreFocus } from "./focus-return";

function page() {
  const doc = {
    activeElement: null as unknown,
    main: null as ReturnType<typeof element> | null,
    querySelector: (selector: string) =>
      selector === "main" ? doc.main : null,
  };
  function element(name: string, { connected = true, focusable = true } = {}) {
    const node = {
      name,
      isConnected: connected,
      focus: () => {
        if (focusable) doc.activeElement = node;
      },
    };
    return node;
  }
  doc.main = element("main");
  return { doc, element };
}

test("dialog close returns focus to the element that opened it", () => {
  const { doc, element } = page();
  const opener = element("종료");
  assert.equal(restoreFocus(opener, doc), opener);
  assert.equal(doc.activeElement, opener);
});

test("a removed opener falls back to main instead of body", () => {
  const { doc, element } = page();
  assert.equal(
    restoreFocus(element("삭제된 행", { connected: false }), doc),
    doc.main,
  );
  assert.equal(doc.activeElement, doc.main);
});

test("a disabled opener (focus does nothing) also falls back to main", () => {
  const { doc, element } = page();
  assert.equal(
    restoreFocus(element("비활성", { focusable: false }), doc),
    doc.main,
  );
});

test("no opener and no main leaves focus alone", () => {
  const { doc } = page();
  doc.main = null;
  assert.equal(restoreFocus(null, doc), null);
  assert.equal(doc.activeElement, null);
});
