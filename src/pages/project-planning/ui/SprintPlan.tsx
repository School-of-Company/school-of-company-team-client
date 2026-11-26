"use client";

import { useLayoutEffect, useRef, useState, type DragEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { projectQueries, type ProjectDetail } from "@/entities/project";
import { sprintErrorMessage, type Sprint } from "@/entities/sprint";
import { taskQueries, type TaskCard } from "@/entities/task";
import { normalizeApiError } from "@/shared/api";
import { ChipSelect, ListSkeleton, QueryState } from "@/shared/ui";
import { useSprintScope } from "../api/sprint-actions";
import {
  applyScopeOverlay,
  boardTasks,
  sourceParams,
  type ScopeOverlay,
} from "../model/sprint-tasks";
import { PlanTaskList } from "./PlanTaskList";
import { SprintCapacity } from "./SprintCapacity";
import { restorePlanFocus } from "../model/plan-focus";

const DRAG_TYPE = "application/x-soc-task";

/**
 * Sprint 계획: 왼쪽 원천(검토 필요·버킷)에서 오른쪽 Sprint 로 끌어 넣는다.
 * 끌기 대신 행의 "넣기"·체크 후 "선택 넣기"·"빼기" 버튼으로도 같은 일을 한다(키보드).
 */
export function SprintPlan({
  project,
  sprint,
  manages,
}: {
  readonly project: ProjectDetail;
  readonly sprint: Sprint;
  readonly manages: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const source = search?.get("source") ?? "backlog";
  const buckets = useQuery({
    ...projectQueries.buckets(project.id),
    enabled: manages,
  });
  const candidates = useQuery({
    ...taskQueries.board(sourceParams(project.key, source), false),
    enabled: manages,
  });
  const scoped = useQuery(
    taskQueries.board(
      new URLSearchParams({
        project: project.key,
        sprint: sprint.id,
      }).toString(),
      false,
    ),
  );
  const scope = useSprintScope(project.id, sprint.id);
  const [overlay, setOverlay] = useState<ScopeOverlay>({});
  const [checked, setChecked] = useState<readonly string[]>([]);
  const [dropping, setDropping] = useState<"in" | "out" | null>(null);
  const [message, setMessage] = useState<{
    readonly tone: "ok" | "error";
    readonly text: string;
  } | null>(null);
  const view = applyScopeOverlay(
    boardTasks(candidates.data),
    boardTasks(scoped.data),
    overlay,
  );
  const busy = scope.isPending;
  const root = useRef<HTMLDivElement>(null);
  const focus = useRef<{
    readonly taskId: string;
    readonly previous: unknown;
  } | null>(null);
  useLayoutEffect(() => {
    const request = focus.current;
    if (!request || !root.current) return;
    const actions = Array.from(
      root.current.querySelectorAll<HTMLButtonElement>(
        "[data-plan-task-action]",
      ),
    );
    const target =
      actions.find(
        (action) => action.dataset.planTaskAction === request.taskId,
      ) ??
      actions[0] ??
      null;
    const restored = restorePlanFocus(request.previous, target);
    focus.current =
      restored && busy ? { ...request, previous: restored } : null;
  });

  function change(
    next: ScopeOverlay,
    request: Parameters<typeof scope.mutate>[0],
    done: string,
  ) {
    if (busy) return;
    const taskId = Object.keys(next)[0];
    if (taskId && root.current?.contains(document.activeElement)) {
      focus.current = { taskId, previous: document.activeElement };
    }
    setMessage(null);
    setOverlay(next);
    scope.mutate(request, {
      onSuccess: () => setMessage({ tone: "ok", text: done }),
      onError: (cause) =>
        setMessage({
          tone: "error",
          text: sprintErrorMessage(normalizeApiError(cause)),
        }),
      // 성공이면 새 목록이 이미 반영됐고, 실패면 overlay 를 지워 원래 자리로 돌아간다.
      onSettled: () => setOverlay({}),
    });
  }
  function add(taskIds: readonly string[]) {
    const ids = taskIds.filter((id) => overlay[id] !== "add");
    if (!ids.length) return;
    change(
      Object.fromEntries(ids.map((id) => [id, "add" as const])),
      { action: "add", taskIds: ids },
      `${ids.length}개를 스프린트에 넣었어요.`,
    );
    setChecked([]);
  }
  function remove(task: TaskCard) {
    change(
      { [task.id]: "remove" },
      { action: "remove", taskId: task.id },
      `${task.key}을(를) 스프린트에서 뺐어요.`,
    );
  }
  function handleDrop(event: DragEvent, target: "in" | "out") {
    event.preventDefault();
    setDropping(null);
    const id = event.dataTransfer.getData(DRAG_TYPE);
    if (!id) return;
    if (target === "in" && view.candidates.some((task) => task.id === id))
      add([id]);
    const task = view.scoped.find((item) => item.id === id);
    if (target === "out" && task) remove(task);
  }
  const dropProps = (target: "in" | "out") =>
    manages
      ? {
          onDragOver: (event: DragEvent) => {
            if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
            event.preventDefault();
            setDropping(target);
          },
          onDragLeave: () => setDropping(null),
          "data-dropping": dropping === target || undefined,
        }
      : {};
  const dragProps = (task: TaskCard) =>
    manages && !busy
      ? {
          draggable: true,
          onDragStart: (event: DragEvent<HTMLLIElement>) => {
            event.dataTransfer.setData(DRAG_TYPE, task.id);
            event.dataTransfer.effectAllowed = "move";
          },
        }
      : {};
  const sourceOptions = [
    { value: "backlog", label: "검토 필요" },
    ...(buckets.data ?? [])
      .filter((bucket) => !bucket.archived)
      .sort((left, right) => left.position - right.position)
      .map((bucket) => ({
        value: `bucket:${bucket.id}`,
        label: `버킷 ${bucket.name}`,
      })),
    { value: "no-bucket", label: "버킷 없음" },
    { value: "open", label: "미완료 전체" },
  ];
  const shownDone = scoped.data?.groups.reduce(
    (sum, group) => sum + group.columns.DONE.length,
    0,
  );
  const listProps = {
    manages,
    busy,
    checked,
    dragProps,
    onCheck: (id: string, selected: boolean) =>
      setChecked((current) =>
        selected ? [...current, id] : current.filter((item) => item !== id),
      ),
    onAdd: add,
    onRemove: remove,
  };
  return (
    <div ref={root} className={manages ? "sprint-plan" : "grid gap-3"}>
      {manages && (
        <section
          className="plan-pane"
          aria-labelledby="plan-source"
          {...dropProps("out")}
          onDrop={manages ? (event) => handleDrop(event, "out") : undefined}
        >
          <div className="plan-pane-head">
            <h3 id="plan-source" className="planning-subhead">
              후보
            </h3>
            <ChipSelect
              label="원천"
              value={
                sourceOptions.some((option) => option.value === source)
                  ? source
                  : "backlog"
              }
              options={sourceOptions}
              onChange={(value) => {
                const params = new URLSearchParams(search?.toString());
                params.set("source", value);
                setChecked([]);
                router.replace(`${pathname}?${params}`, { scroll: false });
              }}
            />
          </div>
          <p className="planning-note">
            어느 스프린트에도 없는 업무예요. 오른쪽으로 끌거나 넣기를 눌러요.
          </p>
          {/* 원천을 바꾸면 이전 후보를 흐리게 두고, 비었으면 문구 없는 같은 크기 박스로 기다린다. */}
          <QueryState
            query={candidates}
            isEmpty={() => view.candidates.length === 0}
            empty={<PlanTaskList {...listProps} tasks={[]} candidate />}
            skeleton={<PlanSkeleton label="후보 업무 불러오는 중" />}
            errorMessage={(error) =>
              sprintErrorMessage(normalizeApiError(error))
            }
          >
            {() => (
              <PlanTaskList {...listProps} tasks={view.candidates} candidate />
            )}
          </QueryState>
        </section>
      )}
      <section
        className="plan-pane"
        aria-labelledby="plan-scope"
        {...dropProps("in")}
        onDrop={manages ? (event) => handleDrop(event, "in") : undefined}
      >
        <div className="plan-pane-head">
          <h3 id="plan-scope" className="planning-subhead">
            이 스프린트{" "}
            <span className="tabular-nums">
              {scoped.data ? view.scoped.length : ""}
            </span>
          </h3>
        </div>
        <SprintCapacity
          projectId={project.id}
          sprint={sprint}
          manages={manages}
        />
        <QueryState
          query={scoped}
          isEmpty={() => false}
          empty={null}
          skeleton={<PlanSkeleton label="스프린트 업무 불러오는 중" />}
          errorMessage={(error) => sprintErrorMessage(normalizeApiError(error))}
        >
          {() => <PlanTaskList {...listProps} tasks={view.scoped} />}
        </QueryState>
        {!!scoped.data && (scoped.data.counts.DONE ?? 0) > (shownDone ?? 0) && (
          <p className="planning-note">
            완료 업무는 전체 {scoped.data.counts.DONE}개 중 최근 {shownDone}개만
            보여요.
          </p>
        )}
      </section>
      <p
        role={message?.tone === "error" ? "alert" : "status"}
        className={`plan-message text-sm ${message?.tone === "error" ? "text-danger" : ""}`}
      >
        {message?.text}
      </p>
    </div>
  );
}

function PlanSkeleton({ label }: { readonly label: string }) {
  return <ListSkeleton label={label} rows={3} rowClassName="h-11" />;
}
