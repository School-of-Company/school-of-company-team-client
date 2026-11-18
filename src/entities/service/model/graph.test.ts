import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutGraph } from "./graph";
import type { GraphNode } from "./types";

const node = (key: string): GraphNode => ({
  id: key,
  key,
  name: key,
  tier: "TIER3",
  archived: false,
});

test("dependents sit left of the services they depend on", () => {
  const layout = layoutGraph({
    nodes: [node("db"), node("server"), node("client")],
    edges: [
      { from: "client", to: "server", kind: "API" },
      { from: "server", to: "db", kind: "DATA" },
    ],
  });
  const layer = Object.fromEntries(layout.nodes.map((n) => [n.key, n.layer]));
  assert.deepEqual(layer, { client: 0, server: 1, db: 2 });
  assert.ok(layout.edges.every((edge) => !edge.back));
});

test("cycles terminate and the closing edge is drawn as a back edge", () => {
  const layout = layoutGraph({
    nodes: [node("a"), node("b"), node("c")],
    edges: [
      { from: "a", to: "b", kind: "API" },
      { from: "b", to: "c", kind: "API" },
      { from: "c", to: "a", kind: "EVENT" },
    ],
  });
  assert.equal(layout.nodes.length, 3);
  assert.equal(layout.edges.filter((edge) => edge.back).length, 1);
  assert.ok(layout.width > 0 && layout.height > 0);
});

test("edges to unknown nodes or to themselves are dropped", () => {
  const layout = layoutGraph({
    nodes: [node("a")],
    edges: [
      { from: "a", to: "a", kind: "API" },
      { from: "a", to: "missing", kind: "API" },
    ],
  });
  assert.equal(layout.edges.length, 0);
  assert.equal(layout.nodes[0]?.layer, 0);
});
