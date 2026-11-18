import type { BoardSort } from "@/entities/task";
import { Select } from "@/shared/ui";

export function BoardViewControls({
  search,
  sort,
  onChange,
}: {
  readonly search: string;
  readonly sort: BoardSort;
  readonly onChange: (value: string) => void;
}) {
  const params = new URLSearchParams(search);
  function change(key: string, value: string) {
    params.set(key, value);
    onChange(params.toString());
  }
  return (
    <div className="board-view-controls flex min-w-0 flex-wrap items-center gap-2">
      <label className="shrink-0">
        <span className="sr-only">그룹</span>
        <Select
          className="ui-chip-select"
          value={params.get("groupBy") ?? "none"}
          onChange={(event) => change("groupBy", event.target.value)}
        >
          <option value="none">그룹 없음</option>
          <option value="owner">담당자별</option>
          <option value="part">파트별</option>
        </Select>
      </label>
      <label className="shrink-0">
        <span className="sr-only">정렬</span>
        <Select
          className="ui-chip-select"
          value={sort}
          onChange={(event) => change("sort", event.target.value)}
        >
          <option value="manual">수동 순서</option>
          <option value="priority">우선순위순</option>
          <option value="deadline">마감일순</option>
        </Select>
      </label>
      {sort !== "manual" && (
        <p className="text-xs text-muted">
          순서 이동은 수동 순서에서만 가능해요.
        </p>
      )}
    </div>
  );
}
