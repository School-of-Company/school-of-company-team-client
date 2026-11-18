import type { BoardSort } from "@/entities/task";
import { ChipSelect } from "@/shared/ui";

const groupOptions = [
  { value: "none", label: "그룹 없음" },
  { value: "owner", label: "담당자별" },
  { value: "part", label: "파트별" },
] as const;

const sortOptions = [
  { value: "manual", label: "수동 순서" },
  { value: "priority", label: "우선순위순" },
  { value: "deadline", label: "마감일순" },
] as const satisfies readonly { value: BoardSort; label: string }[];

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
  const group = params.get("groupBy");
  return (
    <div className="board-view-controls flex min-w-0 flex-wrap items-center gap-2">
      <ChipSelect
        label="그룹"
        value={group === "owner" || group === "part" ? group : "none"}
        options={groupOptions}
        onChange={(value) => change("groupBy", value)}
      />
      <ChipSelect
        label="정렬"
        value={sort}
        options={sortOptions}
        onChange={(value) => change("sort", value)}
      />
      {sort !== "manual" && (
        <p className="text-xs text-muted">
          순서 이동은 수동 순서에서만 가능해요.
        </p>
      )}
    </div>
  );
}
