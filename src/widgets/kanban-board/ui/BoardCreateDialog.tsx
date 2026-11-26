"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { taskApi, type TaskScope, type TaskStatus } from "@/entities/task";
import type { PlanningBucket, ProjectDetail } from "@/entities/project";
import type { Milestone } from "@/entities/milestone";
import { TaskEditor } from "@/features/edit-task";
import {
  ImportIssueForm,
  taskGithubApi,
  taskGithubQueries,
} from "@/features/link-github-issue";
import { normalizeApiError } from "@/shared/api";
import { Dialog, ErrorState, Field, Select } from "@/shared/ui";

export function BoardCreateDialog({
  scope,
  project,
  people,
  initialStatus,
  initialBucketId,
  buckets,
  milestones = [],
  onClose,
  onCreated,
  onImported,
}: {
  readonly scope: TaskScope;
  readonly initialStatus: TaskStatus;
  readonly initialBucketId?: string;
  readonly buckets: readonly PlanningBucket[];
  readonly milestones?: readonly Milestone[];
  readonly project?: ProjectDetail;
  readonly people: readonly { readonly id: string; readonly name: string }[];
  readonly onClose: () => void;
  /** warning 이면 업무는 만들었지만 사람이 다시 손봐야 하는 일이 남았다. */
  readonly onCreated: (message: string, warning?: boolean) => Promise<void>;
  /** Issue 가져오기로 만든(또는 이미 있던) 업무로 간다. */
  readonly onImported: (id: string) => void;
}) {
  const [mode, setMode] = useState<"write" | "import">("write");
  const [target, setTarget] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const repositories = useQuery({
    ...taskGithubQueries.repositories(project?.id ?? ""),
    enabled: !!project,
  });
  const selected =
    target ??
    repositories.data?.find((repository) => repository.isDefault)?.id ??
    "";
  return (
    <Dialog
      open
      onClose={() => {
        if (!saving) onClose();
      }}
      title={scope === "PERSONAL" ? "개인 업무 등록" : "업무 등록"}
    >
      {/* 팀 공용 업무는 Issue 가져오기를 받지 않는다(서버는 개인, 프로젝트만). */}
      {scope !== "TEAM" && (
        <div className="ui-segmented mb-5" role="group" aria-label="등록 방법">
          {(
            [
              ["write", "직접 작성"],
              ["import", "GitHub Issue 가져오기"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="ui-segmented-option"
              aria-pressed={mode === value}
              disabled={saving}
              onClick={() => setMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {mode === "import" ? (
        <ImportIssueForm
          projectId={project?.id}
          onPending={setSaving}
          onCancel={onClose}
          onImported={onImported}
        />
      ) : (
        <>
          {project && (
            <div className="mb-5">
              <Field
                id="new-task-repository"
                label="발행 저장소"
                hint="고르면 등록하자마자 Issue로 발행해요. 공개 저장소면 업무 내용도 공개돼요."
              >
                <Select
                  id="new-task-repository"
                  value={selected}
                  disabled={
                    saving || repositories.isPending || repositories.isError
                  }
                  onChange={(event) => setTarget(event.target.value)}
                >
                  <option value="">발행하지 않음</option>
                  {repositories.data?.map((repository) => (
                    <option key={repository.id} value={repository.id}>
                      {repository.fullName}
                      {repository.private ? " (비공개)" : " (공개)"}
                    </option>
                  ))}
                </Select>
              </Field>
              {repositories.isError && (
                <ErrorState
                  title="발행 저장소를 불러오지 못했어요"
                  description="저장소 없이 업무를 등록하거나 다시 시도할 수 있어요."
                  onRetry={() => void repositories.refetch()}
                />
              )}
            </div>
          )}
          <TaskEditor
            scope={scope}
            initialStatus={initialStatus}
            initialBucketId={initialBucketId}
            buckets={buckets}
            milestones={milestones}
            project={project}
            candidates={people}
            onCancel={onClose}
            onCreate={async (body) => {
              setSaving(true);
              try {
                const created = await taskApi.create(body);
                let message = "업무를 등록했어요.";
                let warning = false;
                if (selected) {
                  try {
                    await taskGithubApi.target(created.id, selected);
                  } catch (cause) {
                    warning = true;
                    message = `업무는 등록했지만 GitHub 발행 저장소를 지정하지 못했어요. 업무 상세에서 다시 설정해 주세요. ${normalizeApiError(cause).message}`;
                  }
                }
                await onCreated(message, warning);
              } finally {
                setSaving(false);
              }
            }}
          />
        </>
      )}
    </Dialog>
  );
}
