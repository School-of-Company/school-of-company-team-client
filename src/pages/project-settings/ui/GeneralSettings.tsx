"use client";

import { useState } from "react";
import {
  kindLabels,
  stageLabels,
  workflowLabels,
  type ProjectKind,
  type ProjectStage,
  type ProjectWorkflow,
} from "@/entities/project";
import {
  getSettingsPermissions,
  useUpdateProject,
  validateProjectForm,
} from "@/features/project-settings";
import { Button, Field, Input, Select, Textarea } from "@/shared/ui";
import type { SettingsProps } from "../model/props";
import { MutationFeedback } from "./MutationFeedback";
import { ProjectImageSettings } from "./ProjectImageSettings";

export function GeneralSettings({ project, user, onSaved }: SettingsProps) {
  const update = useUpdateProject(project.id, onSaved);
  const permissions = getSettingsPermissions(user, project);
  const [validation, setValidation] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  if (!editing)
    return (
      <div className="grid gap-5">
        <ProjectImageSettings
          project={project}
          onSaved={onSaved}
          canManage={permissions.manage}
        />
        <dl className="grid gap-5 text-sm">
          <div>
            <dt className="text-muted">프로젝트 키</dt>
            <dd className="mt-1 font-mono">{project.key}</dd>
          </div>
          <div>
            <dt className="text-muted">이름</dt>
            <dd className="mt-1 break-words">{project.name}</dd>
          </div>
          <div>
            <dt className="text-muted">설명</dt>
            <dd className="mt-1 break-words whitespace-pre-wrap">
              {project.description || "설명이 없습니다."}
            </dd>
          </div>
          <div>
            <dt className="text-muted">공개 범위</dt>
            <dd className="mt-1">
              {project.visibility === "TEAM" ? "팀 전체 공개" : "참여자만 공개"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">단계</dt>
            <dd className="mt-1">{stageLabels[project.stage]}</dd>
          </div>
          <div>
            <dt className="text-muted">유형</dt>
            <dd className="mt-1">{kindLabels[project.kind]}</dd>
          </div>
          <div>
            <dt className="text-muted">진행 방식</dt>
            <dd className="mt-1">{workflowLabels[project.workflow]}</dd>
          </div>
        </dl>
        {permissions.manage && (
          <Button
            variant="secondary"
            className="justify-self-start"
            onClick={() => {
              update.reset();
              setEditing(true);
            }}
          >
            기본 정보 편집
          </Button>
        )}
        <MutationFeedback error={update.error} success={update.isSuccess} />
      </div>
    );
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!permissions.manage || update.isPending) return;
        const data = new FormData(event.currentTarget);
        const name = String(data.get("name") ?? "").trim();
        const visibility =
          data.get("visibility") === "TEAM" ? "TEAM" : "MEMBERS";
        const error = validateProjectForm({ name });
        setValidation(error);
        if (!error)
          update.mutate(
            {
              name,
              description: String(data.get("description") ?? ""),
              visibility,
              stage: data.get("stage") as ProjectStage,
              kind: data.get("kind") as ProjectKind,
              workflow: data.get("workflow") as ProjectWorkflow,
            },
            { onSuccess: () => setEditing(false) },
          );
      }}
    >
      <fieldset
        disabled={!permissions.manage || update.isPending}
        className="grid min-w-0 gap-4"
      >
        <Field id="project-name" label="프로젝트 이름">
          <Input
            id="project-name"
            name="name"
            defaultValue={project.name}
            maxLength={100}
            required
          />
        </Field>
        <Field id="project-description" label="설명">
          <Textarea
            id="project-description"
            name="description"
            defaultValue={project.description ?? ""}
          />
        </Field>
        <Field
          id="project-visibility"
          label="공개 범위"
          hint="참여자만 공개로 바꾸면 Discord 연결이 비활성화됩니다. 관리자가 채널, 기존 스레드 권한을 점검한 뒤 다시 연결해야 합니다."
        >
          <Select
            id="project-visibility"
            name="visibility"
            defaultValue={project.visibility}
            aria-describedby="project-visibility-hint"
          >
            <option value="MEMBERS">참여자만 공개</option>
            <option value="TEAM">팀 전체 공개</option>
          </Select>
        </Field>
        <Field id="project-stage" label="단계">
          <Select id="project-stage" name="stage" defaultValue={project.stage}>
            {Object.entries(stageLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="project-kind" label="유형">
          <Select id="project-kind" name="kind" defaultValue={project.kind}>
            {Object.entries(kindLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="project-workflow" label="진행 방식">
          <Select
            id="project-workflow"
            name="workflow"
            defaultValue={project.workflow}
          >
            {Object.entries(workflowLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        {permissions.manage && (
          <div className="flex gap-2">
            <Button type="submit" loading={update.isPending}>
              설정 저장
            </Button>
            <Button
              variant="ghost"
              disabled={update.isPending}
              onClick={() => setEditing(false)}
            >
              취소
            </Button>
          </div>
        )}
      </fieldset>
      {validation && (
        <p role="alert" className="text-sm text-danger">
          {validation}
        </p>
      )}
      <MutationFeedback error={update.error} success={update.isSuccess} />
    </form>
  );
}
