import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ServiceDetail } from "@/entities/service";
import { DependencyGraph } from "@/widgets/dependency-graph";
import { neighbourGraph } from "../model/neighbour-graph";

const server = {
  serviceId: "S1",
  key: "team-server",
  name: "팀 서버",
  tier: "TIER1",
  archived: false,
  note: null,
} as const;
// team-client ⇄ team-server 순환(D6-4에서 허용): 같은 서비스가 상위·하위 양쪽에 있다.
const client: ServiceDetail = {
  id: "S2",
  key: "team-client",
  name: "팀 클라이언트",
  tier: "TIER2",
  archived: false,
  owners: [],
  canEdit: false,
  description: null,
  repositories: [],
  upstream: [{ ...server, kind: "API" }],
  downstream: [{ ...server, kind: "EVENT" }],
  createdAt: "2026-11-19T00:00:00Z",
  updatedAt: "2026-11-19T00:00:00Z",
};

test("a cyclic neighbour is drawn once and both directions stay as edges", () => {
  const html = renderToStaticMarkup(
    <DependencyGraph highlight="S2" graph={neighbourGraph(client)} />,
  );
  assert.equal(html.match(/aria-label="팀 서버 \(team-server\)/g)?.length, 1);
  assert.equal(
    html.match(/aria-label="팀 클라이언트 \(team-client\)/g)?.length,
    1,
  );
  assert.equal(html.match(/<path[^>]*class="dependency-edge"/g)?.length, 2);
  assert.match(html, /data-kind="API"/);
  assert.match(html, /data-kind="EVENT"/);
});
