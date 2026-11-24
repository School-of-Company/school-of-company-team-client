import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PageHeader } from "./page-header";

test("부제 줄은 값이 없어도 잡고, subtitle={false}일 때만 뺀다", () => {
  assert.match(
    renderToStaticMarkup(<PageHeader title="서비스" />),
    /page-subtitle/,
  );
  assert.doesNotMatch(
    renderToStaticMarkup(<PageHeader title="사용법" subtitle={false} />),
    /page-subtitle/,
  );
});
