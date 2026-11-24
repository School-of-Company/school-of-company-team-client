import assert from "node:assert/strict";
import { test } from "node:test";
import { api, ApiError } from "@/shared/api";
import { projectApi } from "./projects";

test("project images use authenticated versioned endpoints and propagate missing-image errors", async () => {
  const original = api.defaults.adapter;
  const interceptor = api.interceptors.request.use((config) => {
    config.headers.set("Authorization", "Bearer test-image-token");
    return config;
  });
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, "/api/v1/projects/a%2Fb/image?v=42");
    assert.equal(config.responseType, "blob");
    assert.equal(
      config.headers.get("Authorization"),
      "Bearer test-image-token",
    );
    throw new ApiError(404, "PROJECT_IMAGE_NOT_FOUND", "missing");
  };
  try {
    await assert.rejects(
      projectApi.image("a/b", "https://untrusted.example/image?v=42"),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 404 &&
        error.code === "PROJECT_IMAGE_NOT_FOUND",
    );
  } finally {
    api.defaults.adapter = original;
    api.interceptors.request.eject(interceptor);
  }
});
