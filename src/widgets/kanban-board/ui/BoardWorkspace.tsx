"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  taskApi,
  taskKeys,
  taskQueries,
  boardFilterKeys,
  type BoardSort,
  type TaskCard,
  type TaskScope,
  type MoveTask,
  type TaskStatus,
  taskStatuses,
} from "@/entities/task";
import {
  projectAccess,
  projectQueries,
  type Project,
  type ProjectDetail,
} from "@/entities/project";
import { activeUsersQueryOptions } from "@/entities/user";
import { sprintQueries } from "@/entities/sprint";
import { milestoneQueries } from "@/entities/milestone";
import { taskGithubQueries } from "@/features/link-github-issue";
import { TaskError } from "@/entities/task";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import { Spinner } from "@/shared/ui";
import { KanbanBoard } from "./KanbanBoard";
import { BoardViewControls } from "./BoardViewControls";
import { BoardCreateDialog } from "./BoardCreateDialog";
import {
  BoardDetailPanel,
  type BoardDetailComponent,
} from "./BoardDetailPanel";
import { BoardSkeleton } from "./BoardSkeleton";
import { BoardHeader } from "./BoardHeader";

export type BoardActor = {
  readonly id: string;
  readonly role: string;
  readonly name: string;
};
export type BoardFilterProps = {
  readonly search: string;
  readonly onChange: (search: string) => void;
  readonly projects: readonly Project[];
  readonly people: readonly { readonly id: string; readonly name: string }[];
  readonly parts: readonly { readonly id: string; readonly name: string }[];
  readonly buckets: readonly {
    readonly id: string;
    readonly name: string;
    readonly archived: boolean;
  }[];
  readonly personal: boolean;
  readonly repositories: readonly {
    readonly id: string;
    readonly fullName: string;
  }[];
  /** 프로젝트 보드에서만: Sprint·Milestone 필터 선택지(단계 4). */
  readonly sprints?: readonly {
    readonly id: string;
    readonly name: string;
    readonly status: "PLANNED" | "ACTIVE" | "CLOSED";
  }[];
  readonly milestones?: readonly {
    readonly id: string;
    readonly name: string;
  }[];
};

export function BoardWorkspace({
  scope,
  projectId,
  user,
  renderFilters,
  Detail,
  renderProjectNav,
  aside,
}: {
  readonly scope: TaskScope;
  readonly projectId?: string;
  readonly user?: BoardActor;
  readonly renderFilters: (props: BoardFilterProps) => ReactNode;
  readonly Detail?: BoardDetailComponent;
  readonly renderProjectNav?: (project: ProjectDetail) => ReactNode;
  /** 헤더와 툴바 사이에 두는 보조 구역(내 보드의 리뷰 요청 등). */
  readonly aside?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams()?.toString() ?? "";
  const params = new URLSearchParams(search);
  const queryClient = useQueryClient();
  // `?create=1` (from the 내 업무 list) opens the create dialog once on arrival.
  const [creating, setCreating] = useState<{
    readonly status: TaskStatus;
    readonly bucketId?: string;
  } | null>(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("create") === "1"
      ? { status: "BACKLOG" }
      : null,
  );
  const selectionTrigger = useRef<HTMLElement | null>(null);
  function dropCreateParam() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("create")) return;
    url.searchParams.delete("create");
    window.history.replaceState(null, "", url.pathname + url.search);
  }
  // 업무 패널(`?task=`)은 이 보드의 경로에서만 연다. Next.js 가 숨겨 둔 다른 보드가 같은 쿼리를 읽어
  // 보이지 않는 패널을 열지 않게 한다(V-route-focus H1과 같은 유형).
  const boardPath =
    scope === "PERSONAL"
      ? routes.me
      : scope === "TEAM"
        ? routes.team
        : routes.project(projectId ?? "");
  const selectedTask = pathname === boardPath ? params.get("task") : null;
  useEffect(() => {
    if (selectedTask || !selectionTrigger.current) return;
    const previous = selectionTrigger.current;
    const frame = requestAnimationFrame(() => {
      const target = previous.isConnected
        ? previous
        : Array.from(
            document.querySelectorAll<HTMLAnchorElement>("a[href]"),
          ).find(
            (link) =>
              link.getAttribute("href") === previous.getAttribute("href"),
          );
      target?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedTask]);
  const [message, setMessage] = useState("");
  const project = useQuery({
    ...projectQueries.detail(projectId ?? ""),
    enabled: !!projectId,
  });
  const projects = useQuery(projectQueries.list());
  const buckets = useQuery({
    ...projectQueries.buckets(projectId ?? ""),
    enabled: !!projectId,
  });
  const repositories = useQuery({
    ...taskGithubQueries.repositories(projectId ?? ""),
    enabled: !!projectId,
  });
  const sprints = useQuery({
    ...sprintQueries.list(projectId ?? ""),
    enabled: !!projectId,
  });
  const milestones = useQuery({
    ...milestoneQueries.list(projectId ?? ""),
    enabled: !!projectId,
  });
  const assignees = useQuery({
    ...activeUsersQueryOptions(),
    enabled: scope === "TEAM",
  });
  const boardParams = new URLSearchParams(search);
  boardParams.delete("task");
  boardParams.delete("column");
  if (scope !== "PERSONAL") boardParams.set("scope", scope);
  if (project.data) boardParams.set("project", project.data.key);
  // 버킷 그룹은 프로젝트 보드 전용(계약 S-a). 공유 링크로 들어와도 400 대신 그룹 없이 보인다.
  if (scope !== "PROJECT" && boardParams.get("groupBy") === "bucket")
    boardParams.delete("groupBy");
  // `sprint=current`는 프로젝트가 하나일 때만 서버가 받는다(계약 3.7). 다른 보드는 Sprint 축이 없다.
  if (scope !== "PROJECT") {
    boardParams.delete("sprint");
    boardParams.delete("milestone");
  }
  const board = useQuery({
    ...taskQueries.board(boardParams.toString(), scope === "PERSONAL"),
    enabled: !projectId || !!project.data,
  });
  const sort: BoardSort =
    params.get("sort") === "deadline"
      ? "deadline"
      : params.get("sort") === "priority"
        ? "priority"
        : "manual";
  const groupValue = params.get("groupBy");
  const groupBy =
    groupValue === "owner" ||
    groupValue === "part" ||
    groupValue === "reviewer" ||
    (groupValue === "bucket" && scope === "PROJECT")
      ? groupValue
      : null;
  const access =
    project.data && user ? projectAccess(project.data, user) : undefined;
  const canCreate = !!user && (scope !== "PROJECT" || !!access?.editable);
  const cards =
    board.data?.groups.flatMap((group) =>
      Object.values(group.columns).flat(),
    ) ?? [];
  const people = project.data
    ? project.data.members.map((member) => ({
        id: member.userId,
        name: member.name,
      }))
    : (assignees.data ?? [
        ...new Map(
          cards
            .flatMap((card) => card.assignees)
            .map((person) => [person.id, person]),
        ).values(),
      ]);
  const mutation = useMutation({
    mutationFn: ({
      id,
      move,
    }: {
      readonly id: string;
      readonly move: MoveTask;
    }) => taskApi.move(id, move),
    onSuccess: async () => {
      setMessage("업무를 이동했습니다.");
      await queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
    onError: async (cause) => {
      setMessage(normalizeApiError(cause).message);
      // 이웃·버킷이 그 사이 바뀌었을 수 있으니 최신 보드로 맞춘다.
      await queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
  function change(next: string) {
    router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
  }
  function selectTask(id: string | null) {
    const next = new URLSearchParams(search);
    if (id) next.set("task", id);
    else next.delete("task");
    window.history.replaceState(
      null,
      "",
      `${pathname}${next.size ? `?${next}` : ""}`,
    );
  }
  function editable(task: TaskCard) {
    if (!user) return false;
    if (task.scope === "PERSONAL" || task.scope === "TEAM") return true;
    if (scope === "PROJECT") return !!access?.editable;
    if (task.assignees.some((person) => person.id === user.id)) return true;
    const known = queryClient.getQueryData(
      projectQueries.detail(task.projectId ?? "").queryKey,
    );
    return !!known && projectAccess(known, user).editable;
  }
  if (project.isError)
    return (
      <TaskError error={project.error} onRetry={() => void project.refetch()} />
    );
  if (projectId && project.isPending)
    return <Spinner label="프로젝트를 불러오는 중" />;
  return (
    <div className="board-workspace grid min-w-0 gap-6 [overflow-wrap:anywhere] break-keep">
      <BoardHeader
        scope={scope}
        project={project.data}
        board={board.isError ? undefined : board.data}
        canCreate={canCreate}
        editable={!!access?.editable}
        signedIn={!!user}
        onCreate={() => setCreating({ status: "BACKLOG" })}
        onImport={(id) => router.push("/tasks/" + encodeURIComponent(id))}
      />
      {project.data && renderProjectNav?.(project.data)}
      {aside}
      <div className="board-toolbar flex min-w-0 flex-wrap items-start justify-between gap-3">
        {renderFilters({
          search,
          onChange: change,
          projects: scope === "PROJECT" ? [] : (projects.data ?? []),
          people,
          parts: project.data?.parts ?? [
            ...new Map(
              cards
                .flatMap((card) => (card.part ? [card.part] : []))
                .map((part) => [part.id, part]),
            ).values(),
          ],
          buckets: buckets.data ?? [
            ...new Map(
              cards
                .flatMap((card) =>
                  card.planningBucket ? [card.planningBucket] : [],
                )
                .map((bucket) => [bucket.id, bucket]),
            ).values(),
          ],
          personal: scope === "PERSONAL",
          repositories: repositories.data ?? [],
          sprints: sprints.data ?? [],
          milestones: milestones.data ?? [],
        })}
        <BoardViewControls
          search={search}
          sort={sort}
          scope={scope}
          onChange={change}
        />
      </div>
      {message && (
        <p role="status" aria-live="polite" className="text-sm">
          {message}
        </p>
      )}
      {board.isPending ? (
        <BoardSkeleton />
      ) : board.isError ? (
        <TaskError error={board.error} onRetry={() => void board.refetch()} />
      ) : (
        <KanbanBoard
          board={board.data}
          sort={sort}
          groupBy={groupBy}
          laneScope={pathname ?? ""}
          archivedBuckets={
            buckets.data
              ?.filter((bucket) => bucket.archived)
              .map((bucket) => bucket.id) ?? []
          }
          visibleStatus={
            taskStatuses.find((status) => status === params.get("column")) ??
            "BACKLOG"
          }
          onVisibleStatus={(status) => {
            const next = new URLSearchParams(search);
            next.set("column", status);
            change(next.toString());
          }}
          editable={editable}
          pending={mutation.isPending}
          onSelect={
            Detail
              ? (id) => {
                  selectionTrigger.current =
                    document.activeElement instanceof HTMLElement
                      ? document.activeElement
                      : null;
                  selectTask(id);
                }
              : undefined
          }
          onMove={(id, move) => {
            if (!mutation.isPending) mutation.mutate({ id, move });
          }}
          filtered={boardFilterKeys.some((key) => params.has(key))}
          onClearFilters={() => {
            const next = new URLSearchParams(search);
            for (const key of boardFilterKeys) next.delete(key);
            next.delete("doneLimit");
            change(next.toString());
          }}
          onMore={() => {
            const next = new URLSearchParams(search);
            next.set(
              "doneLimit",
              String(Number(boardParams.get("doneLimit") ?? 50) + 50),
            );
            change(next.toString());
          }}
          onCreate={
            canCreate
              ? (status, laneKey) =>
                  setCreating({
                    status,
                    ...(groupBy === "bucket" && laneKey
                      ? { bucketId: laneKey }
                      : {}),
                  })
              : undefined
          }
        />
      )}
      {creating && (
        <BoardCreateDialog
          scope={scope}
          initialStatus={creating.status}
          initialBucketId={creating.bucketId}
          buckets={buckets.data ?? []}
          milestones={milestones.data ?? []}
          project={project.data}
          people={people}
          onClose={() => {
            setCreating(null);
            dropCreateParam();
          }}
          onCreated={async (notice) => {
            setMessage(notice);
            setCreating(null);
            dropCreateParam();
            await queryClient.invalidateQueries({ queryKey: taskKeys.all });
          }}
        />
      )}
      {Detail && selectedTask && (
        <BoardDetailPanel
          taskId={selectedTask}
          user={user}
          Detail={Detail}
          onClose={() => selectTask(null)}
        />
      )}
    </div>
  );
}
