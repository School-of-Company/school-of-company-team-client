import type { DependencyGraph, ServiceDetail } from "@/entities/service";

/** 상세의 이웃 그래프: 이 서비스와 바로 위·아래 서비스. 순환이면 같은 서비스가 양쪽에 있어도 layoutGraph가 노드를 하나로 둔다. */
export function neighbourGraph(service: ServiceDetail): DependencyGraph {
  const node = ({
    serviceId,
    key,
    name,
    tier,
    archived,
  }: ServiceDetail["upstream"][number]) => ({
    id: serviceId,
    key,
    name,
    tier,
    archived,
  });
  return {
    nodes: [
      {
        id: service.id,
        key: service.key,
        name: service.name,
        tier: service.tier,
        archived: service.archived,
      },
      ...service.upstream.map(node),
      ...service.downstream.map(node),
    ],
    edges: [
      ...service.upstream.map((edge) => ({
        from: service.id,
        to: edge.serviceId,
        kind: edge.kind,
      })),
      ...service.downstream.map((edge) => ({
        from: edge.serviceId,
        to: service.id,
        kind: edge.kind,
      })),
    ],
  };
}
