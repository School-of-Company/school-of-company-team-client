import assert from "node:assert/strict";
import { test } from "node:test";
import { api } from "@/shared/api";
import { knowledgeApi, knowledgeKeys, knowledgeQueries } from "./knowledge";
import { QueryClient } from "@tanstack/react-query";
import type { KnowledgeSummary } from "../model/types";

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

test("knowledge placeholders retain filter results only within a successful readable scope", () => {
  const client = new QueryClient();
  const row: KnowledgeSummary = {
    id: "d1",
    kind: "ADR",
    title: "결정",
    status: "DRAFT",
    author: null,
    project: null,
    updatedAt: "2026-11-24T00:00:00Z",
  };
  const oldOptions = knowledgeQueries.list({
    projectId: "p1",
    status: "DRAFT",
  });
  client.setQueryData(oldOptions.queryKey, [row]);
  const previous = client.getQueryCache().build(client, {
    queryKey: knowledgeKeys.list({ projectId: "p1", status: "DRAFT" }),
    queryFn: async (): Promise<readonly KnowledgeSummary[]> => [row],
  });
  const next = knowledgeQueries.list({
    projectId: "p1",
    status: "PUBLISHED",
  }).placeholderData;
  assert.equal(typeof next, "function");
  if (typeof next !== "function") return;
  assert.deepEqual(next([row], previous), [row]);
  for (const filter of [{ projectId: "p2" }, { scope: "ORG" as const }, {}]) {
    const differentScope = knowledgeQueries.list(filter).placeholderData;
    if (typeof differentScope !== "function")
      throw new TypeError("Missing placeholder policy");
    assert.equal(differentScope([row], previous), undefined);
  }
  previous.setState({ status: "error" });
  assert.equal(next([row], previous), undefined);
  client.clear();
});
