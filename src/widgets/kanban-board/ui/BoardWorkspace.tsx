"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  taskApi,
  taskKeys,
  taskQueries,
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
import { TaskError } from "@/entities/task";
import { normalizeApiError } from "@/shared/api";
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
  readonly personal: boolean;
};

export function BoardWorkspace({
  scope,
  projectId,
  user,
  renderFilters,
  Detail,
  renderProjectNav,
}: {
  readonly scope: TaskScope;
  readonly projectId?: string;
  readonly user?: BoardActor;
  readonly renderFilters: (props: BoardFilterProps) => ReactNode;
  readonly Detail?: BoardDetailComponent;
  readonly renderProjectNav?: (project: ProjectDetail) => ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams()?.toString() ?? "";
  const params = new URLSearchParams(search);
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState<TaskStatus | null>(null);
  const selectionTrigger = useRef<HTMLElement | null>(null);
  const selectedTask = params.get("task");
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
  const assignees = useQuery({
    ...activeUsersQueryOptions(),
    enabled: scope === "TEAM",
  });
  const boardParams = new URLSearchParams(search);
  boardParams.delete("task");
  boardParams.delete("column");
  if (scope !== "PERSONAL") boardParams.set("scope", scope);
  if (project.data) boardParams.set("project", project.data.key);
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
    onError: (cause) => setMessage(normalizeApiError(cause).message),
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
        onCreate={() => setCreating("BACKLOG")}
        onImport={(id) => router.push("/tasks/" + encodeURIComponent(id))}
      />
      {project.data && renderProjectNav?.(project.data)}
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
          personal: scope === "PERSONAL",
        })}
        <BoardViewControls search={search} sort={sort} onChange={change} />
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
          onMore={() => {
            const next = new URLSearchParams(search);
            next.set(
              "doneLimit",
              String(Number(boardParams.get("doneLimit") ?? 50) + 50),
            );
            change(next.toString());
          }}
          onCreate={canCreate ? setCreating : undefined}
        />
      )}
      {creating && (
        <BoardCreateDialog
          scope={scope}
          initialStatus={creating}
          project={project.data}
          people={people}
          onClose={() => setCreating(null)}
          onCreated={async (notice) => {
            setMessage(notice);
            setCreating(null);
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
