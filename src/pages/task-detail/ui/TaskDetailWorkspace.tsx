"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  forgetTask,
  taskApi,
  taskKeys,
  taskQueries,
  TaskError,
} from "@/entities/task";
import { projectAccess, projectQueries } from "@/entities/project";
import { TaskEditor } from "@/features/edit-task";
import { activeUsersQueryOptions } from "@/entities/user";
import { TaskGithubPanel } from "@/features/link-github-issue";
import { TaskDiscussion } from "./TaskDiscussion";
import { normalizeApiError } from "@/shared/api";
import { Button, Dialog, Skeleton } from "@/shared/ui";
import { TaskDescription, TaskProperties } from "./TaskContent";

export function TaskDetailWorkspace({
  taskId,
  user,
  headerAction,
}: {
  readonly taskId: string;
  readonly headerAction?: ReactNode;
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
  // 404·403을 받은 상세는 다시 받지 않는다(10초 폴링·재마운트가 같은 404를 되풀이하지 않게). 다시 시도는 수동 refetch.
  const lastError = client.getQueryState(taskKeys.detail(taskId))?.error;
  const gone =
    !!lastError && [403, 404].includes(normalizeApiError(lastError).status);
  const task = useQuery({
    ...taskQueries.detail(taskId),
    enabled: !denied && !gone,
  });
  const project = useQuery({
    ...projectQueries.detail(task.data?.projectId ?? ""),
    enabled: !denied && !!task.data?.projectId,
  });
  const buckets = useQuery({
    ...projectQueries.buckets(task.data?.projectId ?? ""),
    enabled: !denied && task.data?.scope === "PROJECT" && !!task.data.projectId,
  });
  const changeBucket = useMutation({
    mutationFn: (planningBucketId: string) =>
      taskApi.update(taskId, { planningBucketId }),
    onSuccess: async () => {
      setMessage("계획 버킷을 변경했습니다.");
      await client.invalidateQueries({ queryKey: taskKeys.all });
    },
    onError: (cause) => {
      const problem = normalizeApiError(cause);
      setMessage(problem.message);
      if (problem.status === 403 || problem.status === 404) setDenied(cause);
    },
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
  // 404 응답 하나에 정리 한 번(forgetTask가 QueryClient 단위로 응답 시각을 기억). 목록 제외는 매번 한다.
  const errorAt = task.errorUpdatedAt;
  useEffect(() => {
    if (!taskError) return;
    const problem = normalizeApiError(taskError);
    if (problem.status === 403 || problem.status === 404)
      forgetTask(client, taskId, errorAt || Date.now());
  }, [taskError, errorAt, client, taskId]);
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
  if (task.isPending)
    return (
      <div role="status" aria-label="업무를 불러오는 중" className="grid gap-5">
        <Skeleton className="w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-64" />
      </div>
    );
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
    <div className="task-detail">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {headerAction}
        <Link
          href={
            data.projectId
              ? `/projects/${encodeURIComponent(data.projectId)}`
              : data.scope === "TEAM"
                ? "/team"
                : "/me"
          }
          className="ui-button ui-button-secondary ui-button-sm"
        >
          {data.projectName ??
            (data.scope === "TEAM" ? "팀 공용 보드" : "내 보드")}
          로 이동
        </Link>
        <span className="ml-auto flex flex-wrap gap-2">
          {editable && (
            <Button
              variant="secondary"
              className="ui-button-sm"
              onClick={() => setEditing(true)}
            >
              수정
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              className="ui-button-sm"
              onClick={() => setDeleting(true)}
            >
              삭제
            </Button>
          )}
        </span>
      </div>
      <div className="task-detail-grid">
        <div className="task-main">
          <header className="grid gap-1">
            <p className="font-mono text-xs text-muted">
              {data.key ??
                (data.scope === "PERSONAL" ? "개인 업무" : "팀 공용 업무")}
            </p>
            <h1 className="task-title">{data.title}</h1>
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
          <TaskDescription task={data} />
          <TaskGithubPanel
            task={data}
            editable={editable}
            onAccessLost={setDenied}
            onComplete={() => {
              if (!changeStatus.isPending) changeStatus.mutate("DONE");
            }}
            completing={changeStatus.isPending}
          />
          {data.scope !== "PERSONAL" && (
            <TaskDiscussion
              taskId={data.id}
              manages={user?.role === "LEAD" || !!access?.manages}
              onAccessLost={setDenied}
            />
          )}
        </div>
        <TaskProperties
          task={data}
          editable={editable}
          pending={changeStatus.isPending}
          onStatus={(status) => {
            if (!changeStatus.isPending) changeStatus.mutate(status);
          }}
          buckets={buckets.data}
          bucketPending={changeBucket.isPending}
          onBucket={(bucketId) => {
            if (!changeBucket.isPending) changeBucket.mutate(bucketId);
          }}
        />
      </div>
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
            buckets={buckets.data ?? []}
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
