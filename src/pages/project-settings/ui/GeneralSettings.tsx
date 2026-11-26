"use client";

import { useState } from "react";
import {
  kindLabels,
  stageLabels,
  workflowLabels,
  type ProjectDetail,
  type ProjectKind,
  type ProjectStage,
  type ProjectWorkflow,
} from "@/entities/project";
import {
  getSettingsPermissions,
  settingsErrorMessage,
  useUpdateProject,
  validateProjectForm,
} from "@/features/project-settings";
import { normalizeApiError } from "@/shared/api";
import { Button, Input, Select, Textarea } from "@/shared/ui";
import type { SettingsProps } from "../model/props";
import { Panel, SettingsField } from "./Panel";
import { useUnsavedChanges } from "./UnsavedChanges";

type Values = {
  readonly name: string;
  readonly description: string;
  readonly visibility: ProjectDetail["visibility"];
  readonly stage: ProjectStage;
  readonly kind: ProjectKind;
  readonly workflow: ProjectWorkflow;
};

const valuesOf = (project: ProjectDetail): Values => ({
  name: project.name,
  description: project.description ?? "",
  visibility: project.visibility,
  stage: project.stage,
  kind: project.kind,
  workflow: project.workflow,
});

const same = (left: Values, right: Values) =>
  (Object.keys(left) as (keyof Values)[]).every(
    (key) => left[key] === right[key],
  );

export function GeneralSettings({ project, user, onSaved }: SettingsProps) {
  const update = useUpdateProject(project.id, onSaved);
  const editable = getSettingsPermissions(user, project).manage;
  const saved = valuesOf(project);
  const [values, setValues] = useState(saved);
  const [nameError, setNameError] = useState<string | null>(null);
  const dirty = editable && !same(values, saved);
  useUnsavedChanges("general", dirty);
  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    if (update.isSuccess || update.isError) update.reset();
    setValues((current) => ({ ...current, [key]: value }));
  };
  const status = update.isError ? (
    <p role="alert" className="settings-foot-status">
      {settingsErrorMessage(normalizeApiError(update.error))}
    </p>
  ) : (
    <p role="status" className="settings-foot-status">
      {dirty
        ? "저장하지 않은 변경사항이 있어요"
        : update.isSuccess && "저장했어요"}
    </p>
  );
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!dirty || update.isPending) return;
        const error = validateProjectForm({ name: values.name });
        setNameError(error);
        if (error) return;
        update.mutate({ ...values, name: values.name.trim() });
      }}
    >
      <Panel
        title="프로젝트 정보"
        footer={
          editable && (
            <>
              {status}
              <Button
                variant="ghost"
                disabled={!dirty || update.isPending}
                onClick={() => {
                  setValues(saved);
                  setNameError(null);
                  update.reset();
                }}
              >
                되돌리기
              </Button>
              <Button
                type="submit"
                disabled={!dirty}
                loading={update.isPending}
              >
                저장
              </Button>
            </>
          )
        }
      >
        <fieldset
          disabled={!editable || update.isPending}
          className="grid min-w-0 gap-4"
        >
          <SettingsField
            label="프로젝트 키"
            info="키는 업무 번호 앞에 붙고 바꿀 수 없어요."
          >
            <p className="settings-field-value font-mono">{project.key}</p>
          </SettingsField>
          <SettingsField id="project-name" label="이름" error={nameError}>
            <Input
              id="project-name"
              value={values.name}
              maxLength={100}
              required
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "project-name-error" : undefined}
              onChange={(event) => {
                set("name", event.target.value);
                if (nameError)
                  setNameError(
                    validateProjectForm({ name: event.target.value }),
                  );
              }}
              onBlur={() =>
                setNameError(validateProjectForm({ name: values.name }))
              }
            />
          </SettingsField>
          <SettingsField id="project-description" label="설명">
            <Textarea
              id="project-description"
              value={values.description}
              onChange={(event) => set("description", event.target.value)}
            />
          </SettingsField>
          <SettingsField
            id="project-visibility"
            label="공개 범위"
            info="참여자만 공개로 바꾸면 Discord 연결이 꺼져요. 채널과 스레드 권한을 확인한 뒤 다시 연결해야 해요."
          >
            <Select
              id="project-visibility"
              value={values.visibility}
              onChange={(event) =>
                set(
                  "visibility",
                  event.target.value === "TEAM" ? "TEAM" : "MEMBERS",
                )
              }
            >
              <option value="MEMBERS">참여자만 공개</option>
              <option value="TEAM">팀 전체 공개</option>
            </Select>
          </SettingsField>
          <SettingsField id="project-stage" label="단계">
            <Select
              id="project-stage"
              value={values.stage}
              onChange={(event) =>
                set("stage", event.target.value as ProjectStage)
              }
            >
              {Object.entries(stageLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </SettingsField>
          <SettingsField id="project-kind" label="유형">
            <Select
              id="project-kind"
              value={values.kind}
              onChange={(event) =>
                set("kind", event.target.value as ProjectKind)
              }
            >
              {Object.entries(kindLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </SettingsField>
          <SettingsField
            id="project-workflow"
            label="진행 방식"
            info="표시용 이름이에요. 바꿔도 탭은 그대로예요."
          >
            <Select
              id="project-workflow"
              value={values.workflow}
              onChange={(event) =>
                set("workflow", event.target.value as ProjectWorkflow)
              }
            >
              {Object.entries(workflowLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </SettingsField>
        </fieldset>
      </Panel>
    </form>
  );
}
