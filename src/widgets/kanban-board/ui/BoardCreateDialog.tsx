"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { taskApi, type TaskScope, type TaskStatus } from "@/entities/task";
import type { ProjectDetail } from "@/entities/project";
import { TaskEditor } from "@/features/edit-task";
import { taskGithubApi, taskGithubQueries } from "@/features/link-github-issue";
import { normalizeApiError } from "@/shared/api";
import { Dialog, ErrorState, Field, Select } from "@/shared/ui";

export function BoardCreateDialog({
  scope,
  project,
  people,
  initialStatus,
  onClose,
  onCreated,
}: {
  readonly scope: TaskScope;
  readonly initialStatus: TaskStatus;
  readonly project?: ProjectDetail;
  readonly people: readonly { readonly id: string; readonly name: string }[];
  readonly onClose: () => void;
  readonly onCreated: (message: string) => Promise<void>;
}) {
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
      {project && (
        <div className="mb-5">
          <Field
            id="new-task-repository"
            label="발행 저장소"
            hint="저장소를 지정하면 등록 즉시 Issue로 발행합니다. 공개 저장소를 선택하면 업무 내용이 공개됩니다."
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
              title="발행 저장소를 불러오지 못했습니다"
              description="저장소 없이 업무를 등록하거나 다시 시도할 수 있습니다."
              onRetry={() => void repositories.refetch()}
            />
          )}
        </div>
      )}
      <TaskEditor
        scope={scope}
        initialStatus={initialStatus}
        project={project}
        candidates={people}
        onCancel={onClose}
        onCreate={async (body) => {
          setSaving(true);
          try {
            const created = await taskApi.create(body);
            let message = "업무를 등록했습니다.";
            if (selected) {
              try {
                await taskGithubApi.target(created.id, selected);
              } catch (cause) {
                message = `업무는 등록했지만 GitHub 발행 저장소를 지정하지 못했습니다. 업무 상세에서 다시 설정해 주세요. ${normalizeApiError(cause).message}`;
              }
            }
            await onCreated(message);
          } finally {
            setSaving(false);
          }
        }}
      />
    </Dialog>
  );
}
