"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskApi, taskKeys, TaskError } from "@/entities/task";
import { projectAccess } from "@/entities/project";
import { TaskEditor } from "@/features/edit-task";
import {
  TaskGithubPanel,
  taskGithubQueries,
} from "@/features/link-github-issue";
import { knowledgeQueries } from "@/entities/knowledge";
import { TaskDiscussion } from "./TaskDiscussion";
import { TaskDocuments } from "./TaskDocuments";
import { normalizeApiError } from "@/shared/api";
import { formatDate } from "@/shared/lib";
import { Button, Dialog, useToast } from "@/shared/ui";
import { TaskProperties } from "./TaskContent";
import { TaskDescription } from "./TaskDescription";
import { TaskDetailHeader } from "./TaskDetailHeader";
import { TaskDetailSkeleton } from "./TaskDetailSkeleton";
import { useTaskDetail } from "../model/useTaskDetail";

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
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const {
    task,
    project,
    buckets,
    milestones,
    assignees,
    taskError,
    setDenied,
    changeStatus,
    changeBucket,
    changeMilestone,
  } = useTaskDetail(taskId);
  // 아래 칸들이 따로 도착하며 화면을 여러 번 밀지 않게, 첫 조회는 같은 키로 여기서 함께 기다린다(캐시 공유, 추가 요청 없음).
  const scope = task.data?.scope;
  const projectId = scope === "PROJECT" ? task.data?.projectId : null;
  const github = useQuery({
    ...taskGithubQueries.detail(taskId),
    enabled: !!task.data,
  });
  const repositories = useQuery({
    ...taskGithubQueries.repositories(projectId ?? ""),
    enabled: !!projectId,
  });
  const documents = useQuery({
    ...knowledgeQueries.list({ taskId }),
    enabled: !!scope && scope !== "PERSONAL",
  });
  const settling = [
    project,
    buckets,
    milestones,
    github,
    repositories,
    documents,
  ].some((query) => query.isLoading);
  const remove = useMutation({
    mutationFn: () => taskApi.delete(taskId),
    onSuccess: async () => {
      client.removeQueries({ queryKey: taskKeys.detail(taskId) });
      await client.invalidateQueries({ queryKey: taskKeys.all });
      toast("업무를 삭제했습니다.", "success");
      router.push("/me");
    },
    onError: (cause) => {
      toast(normalizeApiError(cause).message, "error");
      setDeleting(false);
    },
  });
  if (taskError)
    return (
      <TaskError
        error={taskError}
        retryMissing
        // 404·403 뒤에는 상세·프로젝트 쿼리를 꺼 두므로(반복 방지) 권한이 돌아오면 사람이 다시 받는다.
        // 오류가 난 그 쿼리만 다시 받는다.
        onRetry={() => {
          setDenied(null);
          void task.refetch();
          if (project.error && task.data?.projectId) void project.refetch();
        }}
      />
    );
  if (task.isPending || settling)
    return <TaskDetailSkeleton back={!headerAction} />;
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
      <TaskDetailHeader
        task={data}
        headerAction={headerAction}
        editable={editable}
        canDelete={canDelete}
        onEdit={() => setEditing(true)}
        onDelete={() => setDeleting(true)}
      />
      <div className="task-detail-grid">
        <div className="task-main">
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
            milestones={milestones.data}
            milestonePending={changeMilestone.isPending}
            onMilestone={(milestoneId) => {
              if (!changeMilestone.isPending)
                changeMilestone.mutate(milestoneId);
            }}
          />
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
          <section>
            <h2 className="task-section-title">활동</h2>
            <dl className="task-activity">
              <div>
                <dt>생성</dt>
                <dd>{formatDate(data.createdAt)}</dd>
              </div>
              <div>
                <dt>최근 수정</dt>
                <dd>{formatDate(data.updatedAt)}</dd>
              </div>
            </dl>
          </section>
          {data.scope !== "PERSONAL" && (
            <TaskDiscussion
              taskId={data.id}
              manages={user?.role === "LEAD" || !!access?.manages}
              onAccessLost={setDenied}
            />
          )}
          {data.scope !== "PERSONAL" && <TaskDocuments taskId={data.id} />}
        </div>
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
            milestones={milestones.data ?? []}
            candidates={candidates}
            onCancel={() => setEditing(false)}
            onUpdate={async (body) => {
              setSaving(true);
              try {
                await taskApi.update(taskId, body);
                await client.invalidateQueries({ queryKey: taskKeys.all });
                setEditing(false);
                toast("업무를 수정했습니다.", "success");
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
          업무를 삭제해도 외부 Issue, PR, Discord 대화는 삭제하지 않습니다.
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
