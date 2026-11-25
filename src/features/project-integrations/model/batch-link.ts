export type LinkOutcome =
  | { readonly status: "linking" }
  | { readonly status: "linked" }
  | { readonly status: "failed"; readonly reason: string };

/**
 * 최대 `limit`개씩 동시에 연결한다. 한 저장소가 실패해도 나머지는 계속 진행하고,
 * 각 결과는 `onUpdate`로 바로 알린다. 반환값은 실패한 id 목록이다.
 */
export async function linkInBatches<Id>(
  ids: readonly Id[],
  link: (id: Id) => Promise<unknown>,
  onUpdate: (id: Id, outcome: LinkOutcome) => void,
  describeError: (error: unknown) => string,
  limit = 3,
): Promise<Id[]> {
  const failed = new Set<Id>();
  let next = 0;
  const worker = async () => {
    while (next < ids.length) {
      const id = ids[next++];
      onUpdate(id, { status: "linking" });
      try {
        await link(id);
        onUpdate(id, { status: "linked" });
      } catch (error) {
        failed.add(id);
        onUpdate(id, { status: "failed", reason: describeError(error) });
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(Math.max(limit, 1), ids.length) }, worker),
  );
  // 입력 순서를 지켜 다시 시도 목록이 화면 순서와 같게 한다.
  return ids.filter((id) => failed.has(id));
}
