import type { PlanningBucket } from "@/entities/project";

/** 활성 버킷 안에서 한 칸 옮긴 전체 순서(보관 버킷은 뒤에 그대로 둔다). */
export function bucketOrderAfterMove(
  buckets: readonly Pick<PlanningBucket, "id" | "archived">[],
  bucketId: string,
  direction: -1 | 1,
) {
  const active = buckets.filter((bucket) => !bucket.archived);
  const index = active.findIndex((bucket) => bucket.id === bucketId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= active.length) return null;
  const ids = active.map((bucket) => bucket.id);
  [ids[index], ids[target]] = [ids[target], ids[index]];
  return [
    ...ids,
    ...buckets.filter((bucket) => bucket.archived).map((bucket) => bucket.id),
  ];
}
