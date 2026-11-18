import assert from "node:assert/strict";
import { test } from "node:test";
import { themeBootScript, THEME_STORAGE_KEY } from "./theme";

function boot(stored: string | null, systemDark: boolean, storageThrows = false) {
  const root = { dataset: {} as Record<string, string> };
  const env = {
    document: { documentElement: root },
    localStorage: {
      getItem: (key: string) => {
        if (storageThrows) throw new Error("blocked");
        return key === THEME_STORAGE_KEY ? stored : null;
      },
    },
    window: { matchMedia: () => ({ matches: systemDark }) },
  };
  new Function("document", "localStorage", "window", themeBootScript)(
    env.document,
    env.localStorage,
    env.window,
  );
  return root.dataset.theme;
}

test("stored choice wins over the system preference", () => {
  assert.equal(boot("light", true), "light");
  assert.equal(boot("dark", false), "dark");
});

test("without a valid stored choice the system preference applies", () => {
  assert.equal(boot(null, true), "dark");
  assert.equal(boot("garbage", false), "light");
});

test("blocked storage falls back to light instead of throwing", () => {
  assert.equal(boot(null, true, true), "light");
});
