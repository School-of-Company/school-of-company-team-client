import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ApiError } from "@/shared/api";
import { TaskError } from "./TaskError";

test("missing tasks have no retry button or unrelated GitHub permission guidance", () => {
  const html = renderToStaticMarkup(
    <TaskError
      error={new ApiError(404, "TASK_NOT_FOUND", "missing")}
      onRetry={() => {}}
    />,
  );
  assert.doesNotMatch(html, /<button/);
  assert.doesNotMatch(html, /GitHub/);
});

test("imported missing tasks explain GitHub origin access without offering a futile retry", () => {
  const html = renderToStaticMarkup(
    <TaskError
      imported
      error={new ApiError(404, "TASK_NOT_FOUND", "missing")}
      onRetry={() => {}}
    />,
  );
  assert.match(html, /GitHub/);
  assert.doesNotMatch(html, /<button/);
});

test("transient failures retain the retry action", () => {
  const html = renderToStaticMarkup(
    <TaskError
      error={new ApiError(503, "UNAVAILABLE", "unavailable")}
      onRetry={() => {}}
    />,
  );
  assert.match(html, /<button/);
});
