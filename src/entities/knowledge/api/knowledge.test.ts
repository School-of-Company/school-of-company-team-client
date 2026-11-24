import assert from "node:assert/strict";
import { test } from "node:test";
import { api } from "@/shared/api";
import { knowledgeApi, knowledgeKeys } from "./knowledge";

test("knowledge project filters have isolated caches and reach the API", async () => {
  assert.notDeepEqual(
    knowledgeKeys.list({}),
    knowledgeKeys.list({ scope: "ORG" }),
  );
  assert.notDeepEqual(
    knowledgeKeys.list({ projectId: "a" }),
    knowledgeKeys.list({ projectId: "b" }),
  );
  const original = api.defaults.adapter;
  const calls: {
    readonly url?: string;
    readonly method?: string;
    readonly data?: string;
    readonly params?: unknown;
  }[] = [];
  api.defaults.adapter = async (config) => {
    calls.push({
      url: config.url,
      method: config.method,
      data: config.data,
      params: config.params,
    });
    return { data: [], status: 200, statusText: "OK", config, headers: {} };
  };
  try {
    await knowledgeApi.list({ projectId: "p1" });
    await knowledgeApi.list({ scope: "ORG" });
    await knowledgeApi.create({
      kind: "ADR",
      title: "배포 결정",
      projectId: "p1",
    });
    await knowledgeApi.update("d1", { projectId: null });
    await knowledgeApi.saveTemplate("ADR", "새 템플릿");
    assert.deepEqual(calls[0].params, { projectId: "p1", limit: 200 });
    assert.deepEqual(calls[1].params, { scope: "ORG", limit: 200 });
    assert.deepEqual(JSON.parse(calls[2].data ?? ""), {
      kind: "ADR",
      title: "배포 결정",
      projectId: "p1",
    });
    assert.deepEqual(JSON.parse(calls[3].data ?? ""), { projectId: null });
    assert.equal(calls[4].url, "/api/v1/knowledge/templates/ADR");
    assert.equal(calls[4].method, "put");
    assert.deepEqual(JSON.parse(calls[4].data ?? ""), { body: "새 템플릿" });
  } finally {
    api.defaults.adapter = original;
  }
});
