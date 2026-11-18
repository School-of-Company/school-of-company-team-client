"use client";

import { useState } from "react";
import {
  getSettingsPermissions,
  useUpdateProject,
  validateProjectForm,
} from "@/features/project-settings";
import { Button, Field, Input, Select, Textarea } from "@/shared/ui";
import type { SettingsProps } from "../model/props";
import { MutationFeedback } from "./MutationFeedback";

export function GeneralSettings({ project, user, onSaved }: SettingsProps) {
  const update = useUpdateProject(project.id, onSaved);
  const permissions = getSettingsPermissions(user, project);
  const [validation, setValidation] = useState<string | null>(null);
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
          update.mutate({
            name,
            description: String(data.get("description") ?? ""),
            visibility,
          });
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
          hint="참여자만 공개로 바꾸면 Discord 연결이 비활성화됩니다. 관리자가 채널·기존 스레드 권한을 점검한 뒤 다시 연결해야 합니다."
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
        {permissions.manage && (
          <Button type="submit" loading={update.isPending}>
            설정 저장
          </Button>
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
