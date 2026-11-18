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
    <div className="board-view-controls flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
      <label className="flex shrink-0 items-center gap-2 text-sm whitespace-nowrap">
        그룹
        <Select
          className="w-auto min-w-28"
          value={params.get("groupBy") ?? "none"}
          onChange={(event) => change("groupBy", event.target.value)}
        >
          <option value="none">그룹 없음</option>
          <option value="owner">담당자</option>
          <option value="part">파트</option>
        </Select>
      </label>
      <label className="flex shrink-0 items-center gap-2 text-sm whitespace-nowrap">
        정렬
        <Select
          className="w-auto min-w-28"
          value={sort}
          onChange={(event) => change("sort", event.target.value)}
        >
          <option value="manual">수동 순서</option>
          <option value="priority">우선순위</option>
          <option value="deadline">마감일</option>
        </Select>
      </label>
      {sort !== "manual" && (
        <p className="self-end text-sm text-muted">
          수동 순서에서 드래그와 순서 이동을 사용할 수 있습니다.
        </p>
      )}
    </div>
  );
}
