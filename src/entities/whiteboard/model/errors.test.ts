import { test } from "node:test";
import { strict as assert } from "node:assert";
import { ApiError } from "@/shared/api";
import {
  TEMPLATE_TOO_LARGE_CODE,
  templateErrorMessage,
  whiteboardErrorMessage,
} from "./errors";

test("TEMPLATE_TOO_LARGE shows the server limit from details.limitBytes", () => {
  const message = templateErrorMessage(
    new ApiError(400, TEMPLATE_TOO_LARGE_CODE, "too large", {
      limitBytes: 300000,
    }),
  );
  assert.match(message, /팀 템플릿은 300KB까지/);
  assert.match(
    templateErrorMessage(new ApiError(400, TEMPLATE_TOO_LARGE_CODE, "x")),
    /300KB/,
  );
});

test("board-wide 413 WHITEBOARD_TOO_LARGE stays handled on template save", () => {
  const message = templateErrorMessage(
    new ApiError(413, "WHITEBOARD_TOO_LARGE", "too large", { limit: "1MB" }),
  );
  assert.match(message, /팀 템플릿/);
  assert.match(message, /1MB/);
});

test("ACCESS_DENIED is template-specific only on template actions", () => {
  const denied = new ApiError(403, "ACCESS_DENIED", "denied");
  assert.match(templateErrorMessage(denied), /팀 템플릿/);
  assert.doesNotMatch(whiteboardErrorMessage(denied), /템플릿/);
});
