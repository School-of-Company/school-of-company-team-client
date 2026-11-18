import type { DependencyGraph, GraphEdge, GraphNode } from "./types";

export type PlacedNode = GraphNode & {
  readonly x: number;
  readonly y: number;
  readonly layer: number;
};
export type PlacedEdge = GraphEdge & {
  /** 레이어가 거꾸로 가는 간선(순환의 일부). 곡선을 아래로 돌려 그린다. */
  readonly back: boolean;
};
export type GraphLayout = {
  readonly nodes: readonly PlacedNode[];
  readonly edges: readonly PlacedEdge[];
  readonly width: number;
  readonly height: number;
};

export const NODE_WIDTH = 168;
export const NODE_HEIGHT = 44;
const COLUMN_GAP = 64;
const ROW_GAP = 16;
const PAD = 8;

/**
 * 의존하는 서비스(왼쪽) → 의존받는 서비스(오른쪽) 순서의 층 배치.
 * 순환은 허용되므로(D6-4) DFS로 되돌아가는 간선만 층 계산에서 빼고, 같은 층 안은 앞 층 위치의 평균(barycenter) 한 번으로 정렬한다.
 * ponytail: 교차 최소화는 한 번만 한다. 서비스가 수십 개를 넘어 겹침이 보이면 반복 횟수를 늘린다.
 */
export function layoutGraph(graph: DependencyGraph): GraphLayout {
  const nodes = [...graph.nodes].sort((a, b) => a.key.localeCompare(b.key));
  const ids = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter(
    (edge) => ids.has(edge.from) && ids.has(edge.to) && edge.from !== edge.to,
  );
  const out = new Map<string, string[]>();
  for (const edge of edges)
    out.set(edge.from, [...(out.get(edge.from) ?? []), edge.to]);

  const backEdges = new Set<string>();
  const state = new Map<string, "open" | "done">();
  const visit = (id: string) => {
    state.set(id, "open");
    for (const next of out.get(id) ?? []) {
      const seen = state.get(next);
      if (seen === "open") backEdges.add(`${id}>${next}`);
      else if (!seen) visit(next);
    }
    state.set(id, "done");
  };
  for (const node of nodes) if (!state.has(node.id)) visit(node.id);

  const forward = edges.filter((e) => !backEdges.has(`${e.from}>${e.to}`));
  const layer = new Map(nodes.map((node) => [node.id, 0]));
  // 앞으로 가는 간선만 남으면 DAG라 노드 수만큼 완화하면 최장 경로가 된다.
  for (let round = 0; round < nodes.length; round++) {
    let changed = false;
    for (const edge of forward) {
      const next = (layer.get(edge.from) ?? 0) + 1;
      if (next > (layer.get(edge.to) ?? 0)) {
        layer.set(edge.to, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const columns: GraphNode[][] = [];
  for (const node of nodes)
    (columns[layer.get(node.id) ?? 0] ??= []).push(node);
  const row = new Map<string, number>();
  columns.forEach((column, index) => {
    if (index > 0) {
      const weight = (node: GraphNode) => {
        const parents = forward
          .filter((edge) => edge.to === node.id)
          .map((edge) => row.get(edge.from) ?? 0);
        return parents.length
          ? parents.reduce((sum, value) => sum + value, 0) / parents.length
          : Number.MAX_SAFE_INTEGER;
      };
      column.sort((a, b) => weight(a) - weight(b));
    }
    column.forEach((node, position) => row.set(node.id, position));
  });

  const tallest = Math.max(1, ...columns.map((column) => column?.length ?? 0));
  const height = PAD * 2 + tallest * NODE_HEIGHT + (tallest - 1) * ROW_GAP;
  const placed = columns.flatMap((column, index) => {
    const columnHeight =
      column.length * NODE_HEIGHT + (column.length - 1) * ROW_GAP;
    const top = PAD + (height - PAD * 2 - columnHeight) / 2;
    return column.map((node, position) => ({
      ...node,
      layer: index,
      x: PAD + index * (NODE_WIDTH + COLUMN_GAP),
      y: top + position * (NODE_HEIGHT + ROW_GAP),
    }));
  });
  const width =
    PAD * 2 +
    Math.max(1, columns.length) * NODE_WIDTH +
    Math.max(0, columns.length - 1) * COLUMN_GAP;
  return {
    nodes: placed,
    edges: edges.map((edge) => ({
      ...edge,
      back: (layer.get(edge.to) ?? 0) <= (layer.get(edge.from) ?? 0),
    })),
    width,
    height: height + (backEdges.size ? NODE_HEIGHT : 0),
  };
}
