"use client";

import { useState } from "react";
import { getSettingsPermissions } from "@/features/project-settings";
import { useProjectParts } from "../api/parts";
import { validatePartName } from "../model/part-validation";
import { Button, EmptyState, Field, Input } from "@/shared/ui";
import { PartRows } from "./PartRows";
import type { SettingsProps } from "../model/props";
import { MutationFeedback } from "./MutationFeedback";

export function PartSettings({ project, user, onSaved }: SettingsProps) {
  const change = useProjectParts(project.id, onSaved);
  const permissions = getSettingsPermissions(user, project);
  const [validation, setValidation] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  function submitName(name: string, partId?: string) {
    if (!permissions.manage || change.isPending) return;
    const error = validatePartName(name);
    setValidation(error);
    if (!error)
      change.mutate(
        partId
          ? { action: "rename", partId, name }
          : { action: "create", name },
        {
          onSuccess: () => {
            if (!partId) setNewName("");
          },
        },
      );
  }
  return (
    <div className="grid gap-6">
      {permissions.manage && (
        <Button
          variant="secondary"
          className="justify-self-start"
          disabled={change.isPending}
          onClick={() => setEditing(!editing)}
        >
          {editing ? "편집 마침" : "파트 편집"}
        </Button>
      )}
      <p className="text-sm text-muted">참여자는 여러 파트에 속할 수 있어요.</p>
      {project.parts.length === 0 && (
        <EmptyState
          title="파트가 없어요"
          description="헤드 어드민 또는 PM이 파트를 만들 수 있어요."
        />
      )}
      <PartRows
        project={project}
        editing={editing}
        permissions={permissions}
        change={change}
        submitName={submitName}
      />
      {editing && permissions.manage && (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitName(
              String(
                new FormData(event.currentTarget).get("name") ?? "",
              ).trim(),
            );
          }}
        >
          <Field id="new-part" label="새 파트 이름">
            <Input
              id="new-part"
              name="name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              maxLength={50}
              required
              disabled={change.isPending}
            />
          </Field>
          <Button type="submit" variant="secondary" loading={change.isPending}>
            파트 만들기
          </Button>
        </form>
      )}
      {validation && (
        <p role="alert" className="text-sm text-danger">
          {validation}
        </p>
      )}
      <MutationFeedback error={change.error} success={change.isSuccess} />
    </div>
  );
}
