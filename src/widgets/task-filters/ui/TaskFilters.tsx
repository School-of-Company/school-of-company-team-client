"use client";

import {
  changeBoardFilter,
  taskStatuses,
  statusLabels,
  type BoardFilterKey,
} from "@/entities/task";
import type { Project } from "@/entities/project";
import { Checkbox, Select } from "@/shared/ui";

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
    <details className="rounded-md border border-border bg-surface p-4">
      <summary className="min-h-6 cursor-pointer text-sm font-semibold">
        필터 · 같은 항목은 OR, 다른 항목은 AND
      </summary>
      <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
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
                  className="flex min-h-11 items-center gap-3 text-sm"
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
          <label className="flex min-h-11 items-center gap-3 text-sm">
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
    </details>
  );
}
