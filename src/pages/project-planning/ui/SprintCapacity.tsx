"use client";

import { useId, useState } from "react";
import { sprintErrorMessage, type Sprint } from "@/entities/sprint";
import { normalizeApiError } from "@/shared/api";
import { Button, Input } from "@/shared/ui";
import { useSprintLifecycle } from "../api/sprint-actions";

/**
 * 계획 크기 합계 / 용량(가중치 단위, D14-a, D14-b). 용량이 없으면 제안 용량과 비교한다.
 * 한 줄 높이를 고정해 편집을 열어도 아래 목록이 밀리지 않는다.
 */
export function SprintCapacity({
  projectId,
  sprint,
  manages,
}: {
  readonly projectId: string;
  readonly sprint: Sprint;
  readonly manages: boolean;
}) {
  const id = useId();
  const { capacity } = useSprintLifecycle(projectId, sprint.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const limit = sprint.capacity ?? sprint.suggestedCapacity;
  const over = limit !== null && sprint.size.planned > limit;
  function save(value: number | null) {
    setError(null);
    capacity.mutate(value, {
      onSuccess: () => setEditing(false),
      onError: (cause) =>
        setError(sprintErrorMessage(normalizeApiError(cause))),
    });
  }
  return (
    <div className="sprint-capacity" data-over={over || undefined}>
      <p className="sprint-capacity-sum">
        <span className="text-muted">계획 크기 합계 / 수용량</span>{" "}
        <strong className="tabular-nums">
          {sprint.size.planned} / {limit ?? "–"}
        </strong>
        {sprint.capacity === null && sprint.suggestedCapacity !== null && (
          <span className="text-muted"> (제안)</span>
        )}
        {sprint.size.unsized > 0 && (
          <span className="text-muted">
            {" "}
            크기 미정{" "}
            <span className="tabular-nums">{sprint.size.unsized}</span>개
          </span>
        )}
      </p>
      {manages && sprint.status !== "CLOSED" && (
        <form
          className="sprint-capacity-edit"
          hidden={!editing}
          onSubmit={(event) => {
            event.preventDefault();
            const text = draft.trim();
            if (!text) return save(null);
            const value = Number(text);
            if (!Number.isInteger(value) || value < 0) {
              setError("수용량은 0 이상 정수로 입력하세요.");
              return;
            }
            save(value);
          }}
        >
          <Input
            id={`${id}-capacity`}
            aria-label="수용량"
            inputMode="numeric"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              sprint.suggestedCapacity === null
                ? "비우면 지움"
                : `제안 ${sprint.suggestedCapacity}`
            }
            className="sprint-capacity-input"
          />
          <Button
            type="submit"
            variant="secondary"
            className="ui-button-sm"
            loading={capacity.isPending}
          >
            저장
          </Button>
          <Button
            variant="ghost"
            className="ui-button-sm"
            disabled={capacity.isPending}
            onClick={() => setEditing(false)}
          >
            취소
          </Button>
        </form>
      )}
      {manages && sprint.status !== "CLOSED" && !editing && (
        <Button
          variant="ghost"
          className="ui-button-sm"
          onClick={() => {
            setDraft(String(sprint.capacity ?? sprint.suggestedCapacity ?? ""));
            setError(null);
            setEditing(true);
          }}
        >
          수용량 수정
        </Button>
      )}
      <p
        className={`sprint-capacity-note text-xs ${error || over ? "text-danger" : "text-muted"}`}
        role={error ? "alert" : over ? "status" : undefined}
      >
        {error ??
          (over
            ? `수용량보다 ${sprint.size.planned - (limit ?? 0)}만큼 많습니다. 업무를 빼거나 수용량을 늘리세요.`
            : sprint.suggestedCapacity === null
              ? "S=1, M=2, L=4, XL=8로 더합니다. 종료한 스프린트가 쌓이면 수용량을 제안합니다."
              : `S=1, M=2, L=4, XL=8로 더합니다. 제안 수용량 ${sprint.suggestedCapacity}은 최근 종료 스프린트의 완료 평균입니다.`)}
      </p>
    </div>
  );
}
