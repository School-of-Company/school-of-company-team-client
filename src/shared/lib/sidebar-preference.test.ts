import assert from "node:assert/strict";
import { test } from "node:test";
import { sidebarBootScript } from "./sidebar-preference";

test("sidebar preference is applied to the document before hydration", () => {
  for (const value of ["true", "false", null]) {
    const document = { documentElement: { dataset: { sidebarCollapsed: "" } } };
    new Function("document", "localStorage", sidebarBootScript)(document, {
      getItem: () => value,
    });
    assert.equal(
      document.documentElement.dataset.sidebarCollapsed,
      String(value === "true"),
    );
  }
});
test("blocked sidebar storage leaves the initial layout expanded", () => {
  const document = { documentElement: { dataset: { sidebarCollapsed: "" } } };
  new Function("document", "localStorage", sidebarBootScript)(document, {
    getItem: () => {
      throw new DOMException("blocked");
    },
  });
  assert.equal(document.documentElement.dataset.sidebarCollapsed, "false");
});
