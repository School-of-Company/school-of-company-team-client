import type { BoardSort, TaskScope } from "@/entities/task";
import { ChipSelect } from "@/shared/ui";

const groupOptions = [
  { value: "none", label: "그룹 없음" },
  { value: "bucket", label: "버킷별" },
  { value: "owner", label: "담당자별" },
  { value: "reviewer", label: "리뷰어별" },
  { value: "part", label: "파트별" },
] as const;

const sortOptions = [
  { value: "manual", label: "수동 순서" },
  { value: "priority", label: "우선순위순" },
  { value: "deadline", label: "마감일순" },
] as const satisfies readonly { value: BoardSort; label: string }[];

// 내 보드 범위(계약 D3-e): 담당 업무 기본, 리뷰할 업무, 둘 다.
const relationOptions = [
  { value: "ASSIGNEE", label: "내 담당" },
  { value: "REVIEWER", label: "내가 리뷰어" },
  { value: "ASSIGNEE,REVIEWER", label: "담당과 리뷰 모두" },
] as const;

export function BoardViewControls({
  search,
  sort,
  scope,
  onChange,
}: {
  readonly search: string;
  readonly sort: BoardSort;
  readonly scope: TaskScope;
  readonly onChange: (value: string) => void;
}) {
  const params = new URLSearchParams(search);
  function change(key: string, value: string) {
    params.set(key, value);
    params.delete("doneLimit");
    onChange(params.toString());
  }
  // 버킷은 프로젝트별이라 프로젝트 보드에서만 그룹 축이 된다(계약 S-a).
  const groups = groupOptions.filter(
    (option) => option.value !== "bucket" || scope === "PROJECT",
  );
  const group =
    groups.find((option) => option.value === params.get("groupBy"))?.value ??
    "none";
  const relation =
    relationOptions.find(
      (option) =>
        option.value ===
        (params.get("relation") ?? "")
          .split(",")
          .filter(Boolean)
          .sort()
          .join(","),
    )?.value ?? "ASSIGNEE";
  const hint =
    sort !== "manual"
      ? "순서 이동은 수동 순서에서만 가능해요."
      : group === "owner" || group === "reviewer" || group === "part"
        ? "레인 사이 이동은 버킷별 그룹에서만 가능해요."
        : null;
  return (
    <div className="board-view-controls flex min-w-0 flex-wrap items-center gap-2">
      {scope === "PERSONAL" && (
        <ChipSelect
          label="범위"
          value={relation}
          options={relationOptions}
          onChange={(value) => change("relation", value)}
        />
      )}
      <ChipSelect
        label="그룹"
        value={group}
        options={groups}
        onChange={(value) => change("groupBy", value)}
      />
      <ChipSelect
        label="정렬"
        value={sort}
        options={sortOptions}
        onChange={(value) => change("sort", value)}
      />
      {hint && <p className="board-view-hint text-xs text-muted">{hint}</p>}
    </div>
  );
}
