import assert from "node:assert/strict";
import { test } from "node:test";
import { sidebarBootScript } from "./sidebar-preference";

const run = (getItem: (key: string) => string | null) => {
  const document = {
    documentElement: {
      dataset: { sidebarCollapsed: "", sidebarClosed: "x" } as Record<
        string,
        string
      >,
    },
  };
  new Function("document", "localStorage", sidebarBootScript)(document, {
    getItem,
  });
  return document.documentElement.dataset;
};

test("sidebar preference is applied to the document before hydration", () => {
  for (const value of ["true", "false", null]) {
    assert.equal(
      run((key) => (key === "soc.sidebar.collapsed" ? value : null))
        .sidebarCollapsed,
      String(value === "true"),
    );
  }
});
test("closed menu groups are listed before hydration", () => {
  const stored: Record<string, string> = {
    "soc.sidebar.group.org": "true",
    "soc.sidebar.group.account": "true",
    "soc.sidebar.group.work": "false",
  };
  assert.equal(run((key) => stored[key] ?? null).sidebarClosed, "org account");
  assert.equal(run(() => null).sidebarClosed, "");
});
test("blocked sidebar storage leaves the initial layout expanded", () => {
  const dataset = run(() => {
    throw new DOMException("blocked");
  });
  assert.equal(dataset.sidebarCollapsed, "false");
  assert.equal(dataset.sidebarClosed, "");
});
