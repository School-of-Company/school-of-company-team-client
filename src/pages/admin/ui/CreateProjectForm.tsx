"use client";

import { useState } from "react";
import {
  kindLabels,
  workflowLabels,
  type Project,
  type ProjectKind,
  type ProjectWorkflow,
} from "@/entities/project";
import { suggestProjectKey } from "../model/project-key";
import { ProjectSetup } from "./ProjectSetup";
import { useCreateProject } from "../api/projects";
import {
  settingsErrorMessage,
  validateProjectForm,
} from "@/features/project-settings";
import { normalizeApiError } from "@/shared/api";
import { Button, Field, Input, Select, Textarea } from "@/shared/ui";

export function CreateProjectForm({
  onSaved,
}: {
  readonly onSaved: () => Promise<unknown>;
}) {
  const create = useCreateProject(onSaved);
  const [validation, setValidation] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);
  const [created, setCreated] = useState<Project | null>(null);
  if (created) return <ProjectSetup project={created} onSaved={onSaved} />;
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (create.isPending) return;
        const form = event.currentTarget;
        const data = new FormData(form);
        const key = String(data.get("key") ?? "").trim();
        const name = String(data.get("name") ?? "").trim();
        const error = validateProjectForm({ key, name });
        setValidation(error);
        if (error) return;
        create.mutate(
          {
            key,
            name,
            description: String(data.get("description") ?? ""),
            visibility: data.get("visibility") === "TEAM" ? "TEAM" : "MEMBERS",
            kind: data.get("kind") as ProjectKind,
            workflow: data.get("workflow") as ProjectWorkflow,
          },
          { onSuccess: setCreated },
        );
      }}
    >
      <fieldset disabled={create.isPending} className="grid min-w-0 gap-4">
        <ol className="ui-steps" aria-label="프로젝트 생성 단계">
          <li aria-current="step">기본 정보</li>
          <li>팀원, PM</li>
          <li>저장소 연결</li>
        </ol>
        <p className="text-sm">
          기본 정보를 저장하면 프로젝트가 생성됩니다. 이후 팀원과 저장소를
          설정하세요.
        </p>
        <Field id="create-project-name" label="프로젝트 이름 (필수)">
          <Input
            id="create-project-name"
            name="name"
            maxLength={100}
            required
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!keyEdited) setKey(suggestProjectKey(event.target.value));
            }}
          />
        </Field>
        <Field
          id="create-project-key"
          label="프로젝트 키"
          hint="대문자로 시작하는 대문자, 숫자 2~10자. 생성 후 변경할 수 없습니다."
        >
          <Input
            id="create-project-key"
            name="key"
            value={key}
            onChange={(event) => {
              setKeyEdited(true);
              setKey(event.target.value.toUpperCase());
            }}
            pattern="[A-Z][A-Z0-9]{1,9}"
            minLength={2}
            maxLength={10}
            required
            aria-describedby="create-project-key-hint"
          />
        </Field>
        <Field id="create-project-description" label="설명">
          <Textarea id="create-project-description" name="description" />
        </Field>
        <Field id="create-project-visibility" label="최초 공개 범위">
          <Select
            id="create-project-visibility"
            name="visibility"
            defaultValue="MEMBERS"
          >
            <option value="MEMBERS">참여자만 공개</option>
            <option value="TEAM">팀 전체 공개</option>
          </Select>
        </Field>
        <Field id="create-project-kind" label="유형">
          <Select id="create-project-kind" name="kind" defaultValue="INTERNAL">
            {Object.entries(kindLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="create-project-workflow"
          label="진행 방식"
          hint="새 개발은 Sprint, 운영 중인 프로젝트는 Kanban. 단계는 검토로 시작합니다."
        >
          <Select
            id="create-project-workflow"
            name="workflow"
            defaultValue="SPRINT"
            aria-describedby="create-project-workflow-hint"
          >
            {Object.entries(workflowLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Button
          type="submit"
          className="justify-self-start"
          loading={create.isPending}
        >
          프로젝트 만들고 계속
        </Button>
      </fieldset>
      {validation && (
        <p role="alert" className="text-sm text-danger">
          {validation}
        </p>
      )}
      {create.isError && (
        <p role="alert" className="text-sm text-danger">
          {settingsErrorMessage(normalizeApiError(create.error))}
        </p>
      )}
    </form>
  );
}
