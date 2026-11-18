"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  boardTotal,
  taskApi,
  taskKeys,
  taskQueries,
  type BoardSort,
  type TaskCard,
  type TaskScope,
  type MoveTask,
} from "@/entities/task";
import {
  projectAccess,
  projectQueries,
  type Project,
} from "@/entities/project";
import { ImportIssue } from "@/features/link-github-issue";
import { activeUsersQueryOptions } from "@/entities/user";
import { TaskError } from "@/entities/task";
import { normalizeApiError } from "@/shared/api";
import { Button, Spinner } from "@/shared/ui";
import { KanbanBoard } from "./KanbanBoard";
import { BoardViewControls } from "./BoardViewControls";
import { BoardCreateDialog } from "./BoardCreateDialog";

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
}: {
  readonly scope: TaskScope;
  readonly projectId?: string;
  readonly user?: BoardActor;
  readonly renderFilters: (props: BoardFilterProps) => ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams()?.toString() ?? "";
  const params = new URLSearchParams(search);
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
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
    <div className="grid min-w-0 gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {project.data?.name ??
              (scope === "PERSONAL" ? "내 보드" : "팀 공용 보드")}
          </h1>
          {board.data && !board.isError && (
            <p className="mt-2 text-sm text-muted">
              고유 업무 {boardTotal(board.data)}개 · 완료 전체{" "}
              {board.data.counts.DONE ?? 0}개
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {projectId && access?.manages && (
            <Link
              href={`/projects/${encodeURIComponent(projectId)}/settings`}
              className="ui-button ui-button-secondary"
            >
              프로젝트 설정
            </Link>
          )}
          {canCreate && (
            <>
              {scope !== "TEAM" && (
                <ImportIssue
                  projectId={projectId}
                  onImported={(id) =>
                    router.push(`/tasks/${encodeURIComponent(id)}`)
                  }
                />
              )}
              <Button onClick={() => setCreating(true)}>
                {scope === "PERSONAL" ? "개인 업무 등록" : "업무 등록"}
              </Button>
            </>
          )}
        </div>
      </header>
      {project.data?.archived && (
        <p role="status" className="text-sm text-muted">
          아카이브된 프로젝트입니다. 조회만 가능합니다.
        </p>
      )}
      {scope === "PROJECT" &&
        user &&
        !access?.editable &&
        !project.data?.archived && (
          <p className="text-sm text-muted">
            참여자만 업무를 등록·수정할 수 있습니다.
          </p>
        )}
      {renderFilters({
        search,
        onChange: change,
        projects: projects.data ?? [],
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
      {message && (
        <p role="status" aria-live="polite" className="text-sm">
          {message}
        </p>
      )}
      {board.isPending ? (
        <Spinner label="보드를 불러오는 중" />
      ) : board.isError ? (
        <TaskError error={board.error} onRetry={() => void board.refetch()} />
      ) : (
        <KanbanBoard
          board={board.data}
          sort={sort}
          editable={editable}
          pending={mutation.isPending}
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
          onCreate={canCreate ? () => setCreating(true) : undefined}
        />
      )}
      {creating && (
        <BoardCreateDialog
          scope={scope}
          project={project.data}
          people={people}
          onClose={() => setCreating(false)}
          onCreated={async (notice) => {
            setMessage(notice);
            setCreating(false);
            await queryClient.invalidateQueries({ queryKey: taskKeys.all });
          }}
        />
      )}
    </div>
  );
}
