import { test } from "node:test";
import { strict as assert } from "node:assert";
import { ApiError } from "@/shared/api";
import {
  TEMPLATE_TOO_LARGE_CODE,
  templateErrorMessage,
  whiteboardErrorMessage,
} from "./errors";

test("template size errors (new code and the generic 413) both get the template message with the limit", () => {
  for (const code of [TEMPLATE_TOO_LARGE_CODE, "WHITEBOARD_TOO_LARGE"]) {
    const message = templateErrorMessage(
      new ApiError(413, code, "too large", { limit: "300KB" }),
    );
    assert.match(message, /팀 템플릿/);
    assert.match(message, /300KB/);
  }
  assert.doesNotMatch(
    templateErrorMessage(new ApiError(413, "WHITEBOARD_TOO_LARGE", "x")),
    /상한/,
  );
});

test("ACCESS_DENIED is template-specific only on template actions", () => {
  const denied = new ApiError(403, "ACCESS_DENIED", "denied");
  assert.match(templateErrorMessage(denied), /팀 템플릿/);
  assert.doesNotMatch(whiteboardErrorMessage(denied), /템플릿/);
});
