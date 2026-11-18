"use client";

import { useState } from "react";
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
          },
          { onSuccess: () => form.reset() },
        );
      }}
    >
      <fieldset disabled={create.isPending} className="grid min-w-0 gap-4">
        <Field
          id="create-project-key"
          label="프로젝트 키"
          hint="대문자로 시작하는 대문자·숫자 2~10자. 생성 후 변경할 수 없습니다."
        >
          <Input
            id="create-project-key"
            name="key"
            pattern="[A-Z][A-Z0-9]{1,9}"
            minLength={2}
            maxLength={10}
            required
            aria-describedby="create-project-key-hint"
          />
        </Field>
        <Field id="create-project-name" label="프로젝트 이름">
          <Input
            id="create-project-name"
            name="name"
            maxLength={100}
            required
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
        <Button type="submit" loading={create.isPending}>
          프로젝트 생성
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
      {create.isSuccess && (
        <p role="status" className="text-sm">
          프로젝트를 생성했습니다. 프로젝트 목록에서 참여자와 PM을 설정하세요.
        </p>
      )}
    </form>
  );
}
