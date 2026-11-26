import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const src = join(here, "../..");

// break-word 는 최소 너비(min-content)를 줄이지 않는다. 공백 없는 긴 이름이 flex/grid 부모를
// 화면 밖으로 넓혀 360폭에서 보드 전체가 잘렸다. 긴 사용자 문자열은 wrap-anywhere 로 감싼다.
test("long user text wraps with wrap-anywhere, not break-words", () => {
  const offenders = readdirSync(src, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".tsx"))
    .filter((file) =>
      /\bbreak-words\b/.test(readFileSync(join(src, file), "utf8")),
    );
  assert.deepEqual(offenders, []);
});

test("headings use overflow-wrap: anywhere in the base layer", () => {
  const base = readFileSync(join(here, "base.css"), "utf8");
  assert.match(base, /h3 \{[^}]*overflow-wrap: anywhere;/);
});
