import assert from "node:assert/strict";
import { test } from "node:test";
import { guardedHref } from "./leave-guard";

const click = {
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
};
const anchor = {
  href: "/projects/p/settings/members",
  target: "",
  download: false,
};
const here = "http://localhost/projects/p/settings";

test("같은 출처의 다른 화면으로 가는 클릭을 붙잡는다", () => {
  assert.equal(
    guardedHref(click, anchor, here),
    "/projects/p/settings/members",
  );
  assert.equal(
    guardedHref(click, { ...anchor, href: "http://localhost/me?x=1#a" }, here),
    "/me?x=1#a",
  );
});

test("새 탭, 다운로드, 다른 출처, 같은 주소는 그대로 둔다", () => {
  assert.equal(guardedHref({ ...click, metaKey: true }, anchor, here), null);
  assert.equal(guardedHref({ ...click, button: 1 }, anchor, here), null);
  assert.equal(guardedHref(click, { ...anchor, target: "_blank" }, here), null);
  assert.equal(guardedHref(click, { ...anchor, download: true }, here), null);
  assert.equal(
    guardedHref(click, { ...anchor, href: "https://github.com" }, here),
    null,
  );
  assert.equal(
    guardedHref(click, { ...anchor, href: "/projects/p/settings#x" }, here),
    null,
  );
  assert.equal(
    guardedHref({ ...click, defaultPrevented: true }, anchor, here),
    null,
  );
});
