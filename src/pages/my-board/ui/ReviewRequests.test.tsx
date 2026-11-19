import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  reviewRequestQueries,
  type MyReviewRequest,
} from "../api/review-requests";
import { ApiError } from "@/shared/api";
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

function render(
  failedRefetch: boolean,
  error: Error = new Error("network"),
  sinceSuccess = 10_000,
) {
  const client = new QueryClient();
  const options = reviewRequestQueries.mine();
  const now = Date.now();
  client.setQueryData(options.queryKey, [item], {
    updatedAt: now - sinceSuccess,
  });
  if (failedRefetch)
    client.getQueryCache().find({ queryKey: options.queryKey })!.setState({
      status: "error",
      error,
      errorUpdatedAt: now,
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

test("일시 장애가 마지막 성공 후 60초를 넘기면 목록을 비우고 오류만 보인다", () => {
  const html = render(true, new Error("network"), 61_000);
  assert.doesNotMatch(html, /HUB-1 로그인 오류 수정/);
  assert.match(html, /최신 정보를 불러오지 못했습니다/);
  assert.match(html, /role="alert"/);
});

test("404 응답이면 60초 전이라도 바로 목록을 비운다", () => {
  const html = render(true, new ApiError(404, "TASK_NOT_FOUND", "없음"), 1_000);
  assert.doesNotMatch(html, /HUB-1 로그인 오류 수정/);
  assert.match(html, /최신 정보를 불러오지 못했습니다/);
});

test("정상 조회면 안내 없이 목록만 보인다", () => {
  const html = render(false);
  assert.match(html, /HUB-1 로그인 오류 수정/);
  assert.doesNotMatch(html, /마지막으로 받은 목록/);
});
