const isThisTask = (item: unknown, taskId: string) =>
  typeof item === "object" &&
  item !== null &&
  ((item as { id?: unknown }).id === taskId ||
    (item as { task?: { id?: unknown } | null }).task?.id === taskId);

/**
 * 캐시된 목록 데이터에서 그 업무를 뺀다. 배열 안의 `{ id }`(카드·연결 업무)와 `{ task: { id } }`(확인 필요 항목)를
 * 모양과 무관하게 찾는다. 바뀐 곳이 없으면 같은 객체를 돌려줘 다시 그리지 않게 한다.
 */
export function withoutTask<T>(data: T, taskId: string): T {
  if (Array.isArray(data)) {
    let changed = false;
    const next: unknown[] = [];
    for (const item of data) {
      if (isThisTask(item, taskId)) {
        changed = true;
        continue;
      }
      const pruned = withoutTask(item, taskId);
      if (pruned !== item) changed = true;
      next.push(pruned);
    }
    return (changed ? next : data) as T;
  }
  if (typeof data === "object" && data !== null) {
    let next: Record<string, unknown> | null = null;
    for (const [key, value] of Object.entries(data)) {
      const pruned = withoutTask(value, taskId);
      if (pruned !== value)
        (next ??= { ...(data as Record<string, unknown>) })[key] = pruned;
    }
    return (next ?? data) as T;
  }
  return data;
}
