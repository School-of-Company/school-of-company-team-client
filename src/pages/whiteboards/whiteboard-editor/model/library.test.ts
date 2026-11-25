import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

// 편집기가 같은 출처에서 받는 내장 도형 라이브러리(public/whiteboard). 서버가 받지 않는 요소가 끼면 저장이 막힌다(D10-6).
const library = JSON.parse(
  readFileSync(
    new URL(
      "../../../../../public/whiteboard/architecture.excalidrawlib",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  type: string;
  version: number;
  libraryItems: {
    id: string;
    name: string;
    elements: { id: string; type: string; link: unknown }[];
  }[];
};

test("built-in library has the 8 architecture shapes in v2 format", () => {
  assert.equal(library.type, "excalidrawlib");
  assert.equal(library.version, 2);
  assert.deepEqual(
    library.libraryItems.map((item) => item.name),
    [
      "서버",
      "데이터베이스",
      "클라우드",
      "사용자",
      "모바일",
      "브라우저",
      "큐",
      "외부 서비스",
    ],
  );
});

test("library elements are savable: no image or embed, no link, unique ids", () => {
  const elements = library.libraryItems.flatMap((item) => item.elements);
  for (const element of elements) {
    assert.ok(!["image", "embeddable", "iframe"].includes(element.type));
    assert.equal(element.link, null);
  }
  assert.equal(
    new Set(elements.map((element) => element.id)).size,
    elements.length,
  );
});
