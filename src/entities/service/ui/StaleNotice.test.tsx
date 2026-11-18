import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StaleNotice } from "./StaleNotice";

const query = (isError: boolean, data: unknown) => ({
  isError,
  isFetching: false,
  data,
  refetch: () => {},
});

test("a failed refetch with kept data shows a non-blocking notice", () => {
  const html = renderToStaticMarkup(<StaleNotice query={query(true, [])} />);
  assert.match(html, /role="status"/);
  assert.match(html, /마지막으로 받은 내용/);
});

test("first-load failures and healthy queries show nothing here", () => {
  assert.equal(
    renderToStaticMarkup(<StaleNotice query={query(true, undefined)} />),
    "",
  );
  assert.equal(
    renderToStaticMarkup(<StaleNotice query={query(false, [])} />),
    "",
  );
});
