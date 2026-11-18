import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MyReviewRequest } from "@/entities/task";
import { reviewRequestQueries } from "../api/review-requests";
import { ReviewRequests } from "./ReviewRequests";

const item: MyReviewRequest = {
  repositoryFullName: "acme/web",
  number: 34,
  title: "HUB-1 로그인 오류 수정",
  url: "https://github.com/acme/web/pull/34",
  draft: false,
  requestedAt: "2026-11-17T12:00:00Z",
  overdue: true,
  tasks: [
    {
      id: "t1",
      key: "HUB-1",
      title: "로그인 오류 수정",
      status: "REVIEW",
      projectId: "p1",
    },
  ],
};

function render(failedRefetch: boolean) {
  const client = new QueryClient();
  const options = reviewRequestQueries.mine();
  client.setQueryData(options.queryKey, [item]);
  if (failedRefetch)
    client
      .getQueryCache()
      .find({ queryKey: options.queryKey })!
      .setState({
        status: "error",
        error: new Error("network"),
        fetchStatus: "idle",
      });
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <ReviewRequests githubLinked />
    </QueryClientProvider>,
  );
}

test("재조회가 실패해도 마지막 리뷰 요청 목록을 유지하고 비차단 안내만 보인다", () => {
  const html = render(true);
  assert.match(html, /HUB-1 로그인 오류 수정/);
  assert.match(html, /마지막으로 받은 목록/);
  assert.doesNotMatch(html, /role="alert"/);
});

test("정상 조회면 안내 없이 목록만 보인다", () => {
  const html = render(false);
  assert.match(html, /HUB-1 로그인 오류 수정/);
  assert.doesNotMatch(html, /마지막으로 받은 목록/);
});
