"use client";

import { useEffect, useRef } from "react";
import {
  changeBoardFilter,
  boardFilterKeys,
  taskStatuses,
  statusLabels,
  type BoardFilterKey,
} from "@/entities/task";
import type { Project } from "@/entities/project";
import { Badge, Button, Checkbox, Select } from "@/shared/ui";

export function TaskFilters({
  search,
  onChange,
  projects,
  people,
  parts,
  personal,
}: {
  readonly search: string;
  readonly onChange: (search: string) => void;
  readonly projects: readonly Project[];
  readonly people: readonly { readonly id: string; readonly name: string }[];
  readonly parts: readonly { readonly id: string; readonly name: string }[];
  readonly personal: boolean;
}) {
  const root = useRef<HTMLDetailsElement>(null);
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
  const selected = (key: BoardFilterKey) =>
    params.getAll(key).flatMap((value) => value.split(","));
  const axes: readonly {
    readonly key: BoardFilterKey;
    readonly label: string;
    readonly choices: readonly {
      readonly value: string;
      readonly label: string;
    }[];
  }[] = [
    {
      key: "project",
      label: "프로젝트",
      choices: projects.map((project) => ({
        value: project.key,
        label: project.name,
      })),
    },
    {
      key: "owner",
      label: "담당자",
      choices: [
        { value: "me", label: "나" },
        { value: "none", label: "미지정" },
        ...people.map((person) => ({ value: person.id, label: person.name })),
      ],
    },
    {
      key: "part",
      label: "파트",
      choices: parts.map((part) => ({ value: part.id, label: part.name })),
    },
    {
      key: "status",
      label: "상태",
      choices: taskStatuses.map((status) => ({
        value: status,
        label: statusLabels[status],
      })),
    },
    {
      key: "priority",
      label: "우선순위",
      choices: ["P0", "P1", "P2", "P3"].map((value) => ({
        value,
        label: value,
      })),
    },
    {
      key: "type",
      label: "타입",
      choices: [
        { value: "TASK", label: "일반 업무" },
        { value: "DEV", label: "개발 업무" },
      ],
    },
  ];
  return (
    <details ref={root} className="board-filters min-w-0">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">
        <span className="ml-2 inline-flex max-w-full flex-wrap items-center gap-2 align-middle">
          필터
          {axes
            .filter((axis) => selected(axis.key).length > 0)
            .map((axis) => (
              <Badge key={axis.key}>
                {axis.label} {selected(axis.key).length}
              </Badge>
            ))}
          {params.get("dueWithin") && (
            <Badge>
              마감{" "}
              {params.get("dueWithin") === "0"
                ? "오늘까지"
                : `${params.get("dueWithin")}일 이내`}
            </Badge>
          )}
          {params.get("blocked") && (
            <Badge>
              {params.get("blocked") === "true"
                ? "막힌 업무"
                : "막히지 않은 업무"}
            </Badge>
          )}
          {selected("source").includes("PERSONAL") && (
            <Badge>개인 업무만</Badge>
          )}
          {!boardFilterKeys.some((key) => params.has(key)) && (
            <span className="font-normal text-muted">전체 업무</span>
          )}
        </span>
      </summary>
      <div className="board-filters-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">
            같은 항목은 OR, 다른 항목은 AND로 적용합니다.
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              const next = new URLSearchParams(search);
              for (const key of boardFilterKeys) next.delete(key);
              next.delete("doneLimit");
              onChange(next.toString());
            }}
          >
            필터 초기화
          </Button>
        </div>
        <div className="board-filters-grid mt-3 grid gap-5">
          {axes
            .filter((axis) => axis.choices.length)
            .map((axis) => (
              <fieldset key={axis.key} className="min-w-0">
                <legend className="mb-2 text-sm font-semibold">
                  {axis.label}
                </legend>
                {axis.choices.map((choice) => (
                  <label
                    key={choice.value}
                    className="flex min-h-9 items-center gap-3 text-sm"
                  >
                    <Checkbox
                      checked={selected(axis.key).includes(choice.value)}
                      onChange={(event) =>
                        onChange(
                          changeBoardFilter(
                            search,
                            axis.key,
                            event.target.checked
                              ? [...selected(axis.key), choice.value]
                              : selected(axis.key).filter(
                                  (value) => value !== choice.value,
                                ),
                          ),
                        )
                      }
                    />
                    <span className="break-words">{choice.label}</span>
                  </label>
                ))}
              </fieldset>
            ))}
          <label className="grid content-start gap-2 text-sm font-semibold">
            마감일
            <Select
              value={params.get("dueWithin") ?? ""}
              onChange={(event) =>
                onChange(
                  changeBoardFilter(search, "dueWithin", [event.target.value]),
                )
              }
            >
              <option value="">전체</option>
              <option value="0">오늘까지</option>
              <option value="3">3일 이내</option>
              <option value="7">7일 이내</option>
              <option value="30">30일 이내</option>
            </Select>
          </label>
          <label className="grid content-start gap-2 text-sm font-semibold">
            막힘
            <Select
              value={params.get("blocked") ?? ""}
              onChange={(event) =>
                onChange(
                  changeBoardFilter(search, "blocked", [event.target.value]),
                )
              }
            >
              <option value="">전체</option>
              <option value="true">막힌 업무만</option>
              <option value="false">막히지 않은 업무만</option>
            </Select>
          </label>
          {personal && (
            <label className="flex min-h-9 items-center gap-3 text-sm">
              <Checkbox
                checked={selected("source").includes("PERSONAL")}
                onChange={(event) =>
                  onChange(
                    changeBoardFilter(
                      search,
                      "source",
                      event.target.checked ? ["PERSONAL"] : [],
                    ),
                  )
                }
              />
              개인 업무만
            </label>
          )}
        </div>
      </div>
    </details>
  );
}
