"use client";

import Link from "next/link";
import {
  kindLabels,
  layoutGraph,
  NODE_HEIGHT,
  NODE_WIDTH,
  tierLabels,
  type DependencyGraph as Graph,
  type DependencyKind,
  type PlacedEdge,
  type PlacedNode,
} from "@/entities/service";
import { routes } from "@/shared/config";

const kinds: readonly DependencyKind[] = ["API", "EVENT", "DATA", "OTHER"];

function edgePath(edge: PlacedEdge, from: PlacedNode, to: PlacedNode) {
  if (edge.back && edge.lane) {
    // 순환을 닫는 간선: 오른쪽으로 나와 노드 아래 통로를 지나 대상 왼쪽으로 들어간다(노드 위를 지나지 않는다).
    const shift = edge.lane.index * 4;
    const right = from.x + NODE_WIDTH + 12 + shift;
    const left = to.x - 16 - shift;
    return `M${from.x + NODE_WIDTH},${from.y + NODE_HEIGHT / 2 + shift} H${right} V${edge.lane.y} H${left} V${to.y + NODE_HEIGHT / 2 + shift} H${to.x - 6}`;
  }
  const x1 = from.x + NODE_WIDTH;
  const y1 = from.y + NODE_HEIGHT / 2;
  const x2 = to.x - 6;
  const y2 = to.y + NODE_HEIGHT / 2;
  const mid = (x1 + x2) / 2;
  return `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
}

/**
 * 서비스 의존관계 그래프. 의존하는 서비스가 왼쪽, 의존받는 서비스가 오른쪽이다.
 * 간선 종류는 선 모양으로 구분하고(색만으로 구분하지 않는다), 같은 내용을 아래 표로도 준다.
 */
export function DependencyGraph({
  graph,
  highlight,
}: {
  readonly graph: Graph;
  readonly highlight?: string;
}) {
  const layout = layoutGraph(graph);
  const byId = new Map(layout.nodes.map((node) => [node.id, node]));
  const degree = (id: string) =>
    graph.edges.filter((edge) => edge.from === id || edge.to === id).length;
  return (
    <figure className="dependency-graph">
      <div className="dependency-graph-scroll">
        <svg
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="group"
          aria-label="서비스 의존관계 그래프"
        >
          <defs>
            <marker
              id="dependency-arrow"
              viewBox="0 0 8 8"
              refX="2"
              refY="4"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L8,4 L0,8 z" className="dependency-arrow" />
            </marker>
          </defs>
          {layout.edges.map((edge) => {
            const from = byId.get(edge.from);
            const to = byId.get(edge.to);
            if (!from || !to) return null;
            return (
              <path
                key={`${edge.from}>${edge.to}`}
                d={edgePath(edge, from, to)}
                className="dependency-edge"
                data-kind={edge.kind}
                data-active={
                  highlight &&
                  (edge.from === highlight || edge.to === highlight)
                    ? true
                    : undefined
                }
                markerEnd="url(#dependency-arrow)"
              />
            );
          })}
          {layout.nodes.map((node) => (
            <Link
              key={node.id}
              href={routes.service(node.key)}
              className="dependency-node"
              data-archived={node.archived || undefined}
              data-active={node.id === highlight || undefined}
              aria-label={`${node.name} (${node.key}), ${tierLabels[node.tier]}, 연결 ${degree(node.id)}개${node.archived ? ", 아카이브" : ""}`}
            >
              <rect
                x={node.x}
                y={node.y}
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={6}
              />
              <text
                x={node.x + 12}
                y={node.y + 18}
                className="dependency-node-name"
              >
                {node.name.length > 14
                  ? `${node.name.slice(0, 13)}…`
                  : node.name}
              </text>
              <text
                x={node.x + 12}
                y={node.y + 34}
                className="dependency-node-meta"
              >
                {node.key.length > 18 ? `${node.key.slice(0, 17)}…` : node.key}
                {node.archived ? " (아카이브)" : ""}
              </text>
            </Link>
          ))}
        </svg>
      </div>
      <figcaption className="dependency-legend">
        <span className="text-muted">선 모양</span>
        {kinds.map((kind) => (
          <span key={kind} className="inline-flex items-center gap-2">
            <svg width="28" height="8" aria-hidden="true">
              <line
                x1="0"
                y1="4"
                x2="28"
                y2="4"
                className="dependency-edge"
                data-kind={kind}
              />
            </svg>
            {kindLabels[kind]}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
