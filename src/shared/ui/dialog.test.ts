import assert from "node:assert/strict";
import { test } from "node:test";
import { dialogSync } from "./dialog";

test("a dialog the caller keeps open is reopened after the browser closes it anyway", () => {
  // 저장 중 Esc 두 번: 호출부는 거부(open 그대로), 네이티브 dialog 는 닫힘.
  assert.equal(
    dialogSync({ open: true, nativeOpen: false, shown: true }),
    "reshow",
  );
});

test("opening, closing and steady states", () => {
  assert.equal(
    dialogSync({ open: true, nativeOpen: false, shown: false }),
    "show",
  );
  assert.equal(dialogSync({ open: true, nativeOpen: true, shown: true }), null);
  assert.equal(
    dialogSync({ open: false, nativeOpen: true, shown: true }),
    "hide",
  );
  // 네이티브로 먼저 닫히고 호출부가 받아들인 경우에도 포커스를 돌려준다.
  assert.equal(
    dialogSync({ open: false, nativeOpen: false, shown: true }),
    "hide",
  );
  assert.equal(
    dialogSync({ open: false, nativeOpen: false, shown: false }),
    null,
  );
});
