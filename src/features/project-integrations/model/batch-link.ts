export type LinkOutcome =
  | { readonly status: "linking" }
  | { readonly status: "linked" }
  | { readonly status: "failed"; readonly reason: string }
  | { readonly status: "canceled" };

/**
 * 최대 `limit`개씩 동시에 연결한다. 한 저장소가 실패해도 나머지는 계속 진행하고,
 * 각 결과는 `onUpdate`로 바로 알린다. `signal`이 중단되면 새 요청을 시작하지 않고,
 * 진행 중인 요청에도 같은 signal을 넘긴다. 반환값은 연결되지 않은 id(실패, 취소,
 * 시작 전) 목록이며 입력 순서를 지킨다.
 */
export async function linkInBatches<Id>(
  ids: readonly Id[],
  link: (id: Id, signal?: AbortSignal) => Promise<unknown>,
  onUpdate: (id: Id, outcome: LinkOutcome) => void,
  describeError: (error: unknown) => string,
  { limit = 3, signal }: { limit?: number; signal?: AbortSignal } = {},
): Promise<Id[]> {
  const linked = new Set<Id>();
  let next = 0;
  const worker = async () => {
    while (next < ids.length && !signal?.aborted) {
      const id = ids[next++];
      onUpdate(id, { status: "linking" });
      try {
        await link(id, signal);
        linked.add(id);
        onUpdate(id, { status: "linked" });
      } catch (error) {
        onUpdate(
          id,
          signal?.aborted
            ? { status: "canceled" }
            : { status: "failed", reason: describeError(error) },
        );
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(Math.max(limit, 1), ids.length) }, worker),
  );
  return ids.filter((id) => !linked.has(id));
}
