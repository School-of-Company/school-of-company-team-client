import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EmptyState, QueryState } from "./feedback";

const query = (state: {
  data?: readonly string[];
  isError?: boolean;
  isPending?: boolean;
  isPlaceholderData?: boolean;
}) => ({
  data: state.data,
  error: new Error("network"),
  isError: state.isError ?? false,
  isPending: state.isPending ?? false,
  isFetching: false,
  isPlaceholderData: state.isPlaceholderData ?? false,
  refetch: () => {},
});

const render = (q: ReturnType<typeof query>) =>
  renderToStaticMarkup(
    <QueryState query={q} empty={<EmptyState title="비어 있음" />}>
      {(data) => <ul>{data.join(",")}</ul>}
    </QueryState>,
  );

test("재조회가 실패해도 캐시는 그대로 두고 다시 시도 안내를 띄운다", () => {
  const html = render(query({ data: ["가"], isError: true }));
  assert.match(html, /<ul>가<\/ul>/);
  assert.match(html, /마지막으로 받은 내용/);
  assert.match(html, /다시 시도/);
  assert.doesNotMatch(html, /role="alert"/);
});

test("캐시가 빈 목록이어도 재조회 실패 안내와 빈 상태를 같이 보여 준다", () => {
  const html = render(query({ data: [], isError: true }));
  assert.match(html, /비어 있음/);
  assert.match(html, /마지막으로 받은 내용/);
});

test("첫 로딩 실패만 오류 화면이다", () => {
  const html = render(query({ isError: true }));
  assert.match(html, /role="alert"/);
  assert.doesNotMatch(html, /마지막으로 받은 내용/);
});

test("첫 로딩은 스켈레톤, placeholder 빈 결과는 문구 없는 박스", () => {
  assert.match(render(query({ isPending: true })), /ui-skeleton-list/);
  const placeholder = render(query({ data: [], isPlaceholderData: true }));
  assert.match(placeholder, /ui-empty/);
  assert.doesNotMatch(placeholder, /비어 있음/);
});

test("정상 결과에는 안내가 없다", () => {
  const html = render(query({ data: ["가"] }));
  assert.doesNotMatch(html, /마지막으로 받은 내용/);
  assert.doesNotMatch(html, /data-placeholder/);
});
