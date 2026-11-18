"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskApi, taskKeys, taskQueries, TaskError } from "@/entities/task";
import { projectAccess, projectQueries } from "@/entities/project";
import { TaskEditor } from "@/features/edit-task";
import { activeUsersQueryOptions } from "@/entities/user";
import { TaskGithubPanel } from "@/features/link-github-issue";
import { TaskDiscussion } from "./TaskDiscussion";
import { normalizeApiError } from "@/shared/api";
import { Button, Dialog, Spinner } from "@/shared/ui";
import { TaskContent } from "./TaskContent";

export function TaskDetailWorkspace({
  taskId,
  user,
}: {
  readonly taskId: string;
  readonly user?: {
    readonly id: string;
    readonly role: string;
    readonly name: string;
  };
}) {
  const client = useQueryClient();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [denied, setDenied] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const task = useQuery({ ...taskQueries.detail(taskId), enabled: !denied });
  const project = useQuery({
    ...projectQueries.detail(task.data?.projectId ?? ""),
    enabled: !denied && !!task.data?.projectId,
  });
  const assignees = useQuery({
    ...activeUsersQueryOptions(),
    enabled: task.data?.scope === "TEAM" && !denied,
  });
  const projectProblem = project.error
    ? normalizeApiError(project.error)
    : null;
  const taskError =
    denied ||
    task.error ||
    (projectProblem &&
    (projectProblem.status === 403 || projectProblem.status === 404)
      ? project.error
      : null);
  useEffect(() => {
    if (!taskError) return;
    const problem = normalizeApiError(taskError);
    if (problem.status === 403 || problem.status === 404) {
      client.removeQueries({ queryKey: taskKeys.all });
      void client.invalidateQueries({ queryKey: ["projects"] });
    }
  }, [taskError, client]);
  const changeStatus = useMutation({
    mutationFn: (status: Parameters<typeof taskApi.move>[1]["status"]) =>
      taskApi.move(taskId, { status, prevId: null, nextId: null }),
    onSuccess: async () => {
      setMessage("상태를 변경했습니다.");
      await client.invalidateQueries({ queryKey: taskKeys.all });
    },
    onError: (cause) => {
      const problem = normalizeApiError(cause);
      setMessage(problem.message);
      if (problem.status === 403 || problem.status === 404) setDenied(cause);
    },
  });
  const remove = useMutation({
    mutationFn: () => taskApi.delete(taskId),
    onSuccess: async () => {
      client.removeQueries({ queryKey: taskKeys.detail(taskId) });
      await client.invalidateQueries({ queryKey: taskKeys.all });
      router.push("/me");
    },
    onError: (cause) => {
      setMessage(normalizeApiError(cause).message);
      setDeleting(false);
    },
  });
  if (taskError)
    return (
      <TaskError
        error={taskError}
        onRetry={() => {
          setDenied(null);
          void task.refetch();
        }}
      />
    );
  if (task.isPending) return <Spinner label="업무를 불러오는 중" />;
  if (!task.data) return null;
  const data = task.data;
  const access =
    project.data && user ? projectAccess(project.data, user) : null;
  const editable = !!user && (data.scope !== "PROJECT" || !!access?.editable);
  const canDelete =
    editable &&
    !!user &&
    (data.createdBy === user.id || user.role === "LEAD" || !!access?.manages);
  const candidates = project.data
    ? project.data.members.map((member) => ({
        id: member.userId,
        name: member.name,
      }))
    : (assignees.data ?? data.assignees);
  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <Link
        href={
          data.projectId
            ? `/projects/${encodeURIComponent(data.projectId)}`
            : data.scope === "TEAM"
              ? "/team"
              : "/me"
        }
        className="inline-flex min-h-11 items-center text-sm text-brand underline"
      >
        {data.projectName ??
          (data.scope === "TEAM" ? "팀 공용 보드" : "내 보드")}
        로 이동
      </Link>
      <header className="grid gap-4">
        <p className="text-sm text-muted">
          {data.key ??
            (data.scope === "PERSONAL" ? "개인 업무" : "팀 공용 업무")}
        </p>
        <h1 className="text-2xl font-bold break-words">{data.title}</h1>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Button onClick={() => setEditing(true)}>업무 수정</Button>
          )}
          {canDelete && (
            <Button variant="ghost" onClick={() => setDeleting(true)}>
              업무 삭제
            </Button>
          )}
        </div>
      </header>
      {project.data?.archived && (
        <p className="text-sm text-muted">
          아카이브된 프로젝트입니다. 조회만 가능합니다.
        </p>
      )}
      {project.isError && (
        <TaskError
          error={project.error}
          onRetry={() => void project.refetch()}
        />
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <TaskContent
        task={data}
        editable={editable}
        pending={changeStatus.isPending}
        onStatus={(status) => {
          if (!changeStatus.isPending) changeStatus.mutate(status);
        }}
      />
      <TaskGithubPanel
        task={data}
        editable={editable}
        onAccessLost={setDenied}
      />
      {data.scope !== "PERSONAL" && (
        <TaskDiscussion
          taskId={data.id}
          manages={user?.role === "LEAD" || !!access?.manages}
          onAccessLost={setDenied}
        />
      )}
      <Dialog
        open={editing}
        onClose={() => {
          if (!saving) setEditing(false);
        }}
        title="업무 수정"
      >
        {editing && (
          <TaskEditor
            scope={data.scope}
            initial={data}
            project={project.data}
            candidates={candidates}
            onCancel={() => setEditing(false)}
            onUpdate={async (body) => {
              setSaving(true);
              try {
                await taskApi.update(taskId, body);
                await client.invalidateQueries({ queryKey: taskKeys.all });
                setEditing(false);
              } catch (cause) {
                const problem = normalizeApiError(cause);
                if (problem.status === 403 || problem.status === 404)
                  setDenied(cause);
                throw cause;
              } finally {
                setSaving(false);
              }
            }}
          />
        )}
      </Dialog>
      <Dialog
        open={deleting}
        onClose={() => {
          if (!remove.isPending) setDeleting(false);
        }}
        title="업무를 삭제할까요?"
      >
        <p className="mb-6 text-sm text-muted">
          업무를 삭제해도 외부 Issue·PR·Discord 대화는 삭제하지 않습니다.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            disabled={remove.isPending}
            onClick={() => setDeleting(false)}
          >
            취소
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() => {
              if (!remove.isPending) remove.mutate();
            }}
          >
            삭제
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
