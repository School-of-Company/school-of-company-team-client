"use client";

import { useEffect, useId, useRef } from "react";
import {
  changeBoardFilter,
  taskStatuses,
  statusLabels,
  priorityLabels,
  type BoardFilterKey,
} from "@/entities/task";
import type { Project } from "@/entities/project";
import { Button, Icon } from "@/shared/ui";
import { summarize } from "../model/summary";

export function TaskFilters({
  search,
  onChange,
  projects,
  people,
  parts,
  buckets = [],
  personal,
  repositories = [],
  sprints = [],
  milestones = [],
}: {
  readonly search: string;
  readonly onChange: (search: string) => void;
  readonly projects: readonly Project[];
  readonly people: readonly { readonly id: string; readonly name: string }[];
  readonly parts: readonly { readonly id: string; readonly name: string }[];
  readonly buckets?: readonly {
    readonly id: string;
    readonly name: string;
    readonly archived: boolean;
  }[];
  readonly personal: boolean;
  readonly repositories?: readonly {
    readonly id: string;
    readonly fullName: string;
  }[];
  /** 프로젝트 보드에서만 넘어온다. 비어 있으면 Sprint, Milestone 축을 숨긴다. */
  readonly sprints?: readonly {
    readonly id: string;
    readonly name: string;
    readonly status: "PLANNED" | "ACTIVE" | "CLOSED";
  }[];
  readonly milestones?: readonly {
    readonly id: string;
    readonly name: string;
  }[];
}) {
  const root = useRef<HTMLDetailsElement>(null);
  const prefix = useId();
  // Popover behaviour for <details>: close on outside pointer and Escape.
  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      const details = root.current;
      if (details?.open && !details.contains(event.target as Node))
        details.open = false;
    };
    const onKey = (event: KeyboardEvent) => {
      const details = root.current;
      if (event.key !== "Escape" || !details?.open) return;
      details.open = false;
      details.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  const params = new URLSearchParams(search);
  // 종료된 Sprint 에는 열린 소속이 없어 고를 이유가 없다(필터는 열린 소속 기준).
  const openSprints = sprints.filter((sprint) => sprint.status !== "CLOSED");
  const selected = (key: BoardFilterKey) =>
    params.getAll(key).flatMap((value) => value.split(","));
  const personChoices = people.map((person) => ({
    value: person.id,
    label: person.name,
  }));
  // 모든 축이 같은 칩 버튼을 쓴다. single 축은 하나만 고르고, 고른 칩을 다시 누르면 해제된다.
  const groups: readonly {
    readonly key: BoardFilterKey;
    readonly label: string;
    readonly unit: string;
    readonly single?: boolean;
    readonly choices: readonly {
      readonly value: string;
      readonly label: string;
    }[];
  }[] = [
    {
      key: "owner",
      label: "담당자",
      unit: "명",
      choices: [
        { value: "me", label: "나" },
        { value: "none", label: "미지정" },
        ...personChoices,
      ],
    },
    {
      key: "reviewer",
      label: "리뷰어",
      unit: "명",
      choices: [
        { value: "me", label: "나" },
        { value: "none", label: "없음" },
        ...personChoices,
      ],
    },
    {
      key: "status",
      label: "상태",
      unit: "개",
      choices: taskStatuses.map((status) => ({
        value: status,
        label: statusLabels[status],
      })),
    },
    {
      key: "priority",
      label: "우선순위",
      unit: "개",
      choices: (["P0", "P1", "P2", "P3"] as const).map((value) => ({
        value,
        label: priorityLabels[value],
      })),
    },
    {
      key: "dueWithin",
      label: "마감일",
      unit: "",
      single: true,
      choices: [
        { value: "0", label: "오늘까지" },
        { value: "3", label: "3일 이내" },
        { value: "7", label: "7일 이내" },
        { value: "30", label: "30일 이내" },
      ],
    },
    {
      key: "blocked",
      label: "막힘",
      unit: "",
      single: true,
      choices: [
        { value: "true", label: "막힘 있음" },
        { value: "false", label: "막힘 없음" },
      ],
    },
    {
      key: "type",
      label: "타입",
      unit: "개",
      choices: [
        { value: "TASK", label: "일반 업무" },
        { value: "DEV", label: "개발 업무" },
      ],
    },
    {
      key: "project",
      label: "프로젝트",
      unit: "개",
      choices: projects.map((project) => ({
        value: project.key,
        label: project.name,
      })),
    },
    {
      key: "part",
      label: "파트",
      unit: "개",
      choices: parts.map((part) => ({ value: part.id, label: part.name })),
    },
    {
      key: "bucket",
      label: "버킷",
      unit: "개",
      choices: buckets.length
        ? [
            ...buckets.map((bucket) => ({
              value: bucket.id,
              label: bucket.archived ? `${bucket.name} (보관)` : bucket.name,
            })),
            { value: "none", label: "버킷 없음" },
          ]
        : [],
    },
    {
      key: "sprint",
      label: "스프린트",
      unit: "",
      single: true,
      choices: sprints.length
        ? [
            { value: "current", label: "현재 스프린트" },
            { value: "none", label: "스프린트 없음" },
            ...openSprints.map((sprint) => ({
              value: sprint.id,
              label: sprint.name,
            })),
          ]
        : [],
    },
    {
      key: "milestone",
      label: "마일스톤",
      unit: "개",
      choices: milestones.length
        ? [
            ...milestones.map((milestone) => ({
              value: milestone.id,
              label: milestone.name,
            })),
            { value: "none", label: "마일스톤 없음" },
          ]
        : [],
    },
    {
      key: "repository",
      label: "저장소",
      unit: "개",
      choices: repositories.length
        ? [
            ...repositories.map((repository) => ({
              value: repository.id,
              label:
                repository.fullName.split("/").pop() ?? repository.fullName,
            })),
            { value: "none", label: "연결 없음" },
          ]
        : [],
    },
    {
      key: "source",
      label: "출처",
      unit: "",
      single: true,
      choices: personal ? [{ value: "PERSONAL", label: "개인 업무만" }] : [],
    },
  ];
  // 이름을 아직 못 받은 값(목록 밖 id)은 칩에 "알 수 없음"으로 센다.
  const applied = groups.flatMap((group) => {
    const values = selected(group.key);
    if (values.length === 0) return [];
    const labels = values.map(
      (value) =>
        group.choices.find((choice) => choice.value === value)?.label ??
        sprints.find((sprint) => sprint.id === value)?.name ??
        "알 수 없음",
    );
    return [{ group, labels }];
  });
  function set(key: BoardFilterKey, values: readonly string[]) {
    onChange(changeBoardFilter(search, key, values));
  }
  function clearAll() {
    const next = new URLSearchParams(search);
    for (const group of groups) next.delete(group.key);
    next.delete("doneLimit");
    onChange(next.toString());
  }
  return (
    <div className="board-filter-bar">
      <details ref={root} className="board-filters">
        <summary>
          <Icon name="filter" width={16} height={16} />
          필터
          {applied.length > 0 && (
            <span className="board-filter-count tabular-nums">
              {applied.length}
              <span className="sr-only">개 적용됨</span>
            </span>
          )}
        </summary>
        <div className="board-filters-panel">
          <div className="board-filters-head">
            <p className="text-sm font-semibold">필터</p>
            <Button
              variant="ghost"
              className="ui-button-sm"
              disabled={applied.length === 0}
              onClick={clearAll}
            >
              모두 지우기
            </Button>
          </div>
          <div className="board-filter-groups">
            {groups
              .filter((group) => group.choices.length)
              .map((group) => {
                const values = selected(group.key);
                const labelId = `${prefix}-${group.key}`;
                return (
                  <div
                    key={group.key}
                    role="group"
                    aria-labelledby={labelId}
                    className="board-filter-group"
                  >
                    <p id={labelId} className="board-filter-group-label">
                      {group.label}
                    </p>
                    <div className="board-filter-options">
                      {group.choices.map((choice) => {
                        const on = values.includes(choice.value);
                        return (
                          <button
                            key={choice.value}
                            type="button"
                            className="board-filter-option"
                            aria-pressed={on}
                            title={choice.label}
                            onClick={() =>
                              set(
                                group.key,
                                on
                                  ? values.filter(
                                      (value) => value !== choice.value,
                                    )
                                  : group.single
                                    ? [choice.value]
                                    : [...values, choice.value],
                              )
                            }
                          >
                            {on && <Icon name="check" width={14} height={14} />}
                            <span className="truncate">{choice.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </details>
      {applied.length > 0 && (
        <ul className="board-filter-chips" aria-label="적용된 필터">
          {applied.map(({ group, labels }) => (
            <li
              key={group.key}
              className="board-filter-chip"
              title={`${group.label} ${labels.join(", ")}`}
            >
              <span className="board-filter-chip-label">{group.label}</span>
              <span className="truncate">{summarize(labels, group.unit)}</span>
              <button
                type="button"
                aria-label={`${group.label} 필터 해제`}
                onClick={() => set(group.key, [])}
              >
                <Icon name="close" width={14} height={14} />
              </button>
            </li>
          ))}
          {applied.length > 1 && (
            <li>
              <button
                type="button"
                className="board-filter-clear"
                onClick={clearAll}
              >
                모두 지우기
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
