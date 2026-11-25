import type { LinkOutcome } from "./batch-link";

type Results = ReadonlyMap<number, LinkOutcome>;

/** 이미 연결됐거나 이번 묶음에서 연결 중이거나 연결된 저장소는 다시 보내지 않는다. */
export function isSelectable(
  repositoryId: number,
  linkedIds: ReadonlySet<number>,
  results: Results,
): boolean {
  const status = results.get(repositoryId)?.status;
  return (
    !linkedIds.has(repositoryId) && status !== "linking" && status !== "linked"
  );
}

/** 선택한 것 중 지금 보낼 수 있는 저장소 id. 입력(화면) 순서를 지킨다. */
export function chosenIds(
  repositoryIds: readonly number[],
  selected: ReadonlySet<number>,
  linkedIds: ReadonlySet<number>,
  results: Results,
): number[] {
  return repositoryIds.filter(
    (id) => selected.has(id) && isSelectable(id, linkedIds, results),
  );
}

/**
 * 서버는 첫 연결 때 기본 저장소를 자동으로 정하지 않는다(`isDefault: true`일 때만 지정).
 * 아직 기본 저장소가 없고, 고른 저장소가 이번 묶음에 있을 때 그 하나만 true다.
 */
export function defaultRepositoryId(
  ids: readonly number[],
  pickedId: number | null,
  hasDefault: boolean,
): number | null {
  if (hasDefault || pickedId === null || !ids.includes(pickedId)) return null;
  return pickedId;
}

/** 연결됨은 연결 목록(서버)을 따른다. 묶음 결과의 연결됨은 목록을 다시 받기 전까지만 쓴다. */
export function statusLabel(
  repositoryId: number,
  linkedIds: ReadonlySet<number>,
  results: Results,
): string {
  const outcome = results.get(repositoryId);
  if (outcome?.status === "linking") return "연결 중";
  if (linkedIds.has(repositoryId) || outcome?.status === "linked")
    return "연결됨";
  if (outcome?.status === "failed") return `실패: ${outcome.reason}`;
  if (outcome?.status === "canceled") return "취소됨";
  return "";
}

/** 목록을 다시 받은 뒤 남길 결과: 연결된 것은 목록이 보여 주므로 지우고 실패와 취소만 남긴다. */
export function settledResults(
  results: Results,
  linkedIds: ReadonlySet<number>,
): Map<number, LinkOutcome> {
  return new Map(
    [...results].filter(
      ([id, outcome]) => outcome.status !== "linked" && !linkedIds.has(id),
    ),
  );
}
