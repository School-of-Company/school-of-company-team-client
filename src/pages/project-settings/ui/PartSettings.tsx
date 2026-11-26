"use client";

import { useState } from "react";
import { getSettingsPermissions } from "@/features/project-settings";
import { useProjectParts } from "../api/parts";
import { validatePartName } from "../model/part-validation";
import { Button, EmptyState, Input } from "@/shared/ui";
import { PartRows } from "./PartRows";
import type { SettingsProps } from "../model/props";
import { MutationFeedback } from "./MutationFeedback";
import { Panel } from "./Panel";

export function PartSettings({ project, user, onSaved }: SettingsProps) {
  const change = useProjectParts(project.id, onSaved);
  const permissions = getSettingsPermissions(user, project);
  const [newName, setNewName] = useState("");
  const [newError, setNewError] = useState<string | null>(null);
  return (
    <Panel
      title="파트"
      count={project.parts.length}
      info="참여자는 여러 파트에 속할 수 있어요. 파트를 지워도 업무는 남고 파트 배정만 풀려요."
      footer={
        permissions.manage && (
          <form
            noValidate
            className="settings-inline-form w-full"
            onSubmit={(event) => {
              event.preventDefault();
              if (change.isPending) return;
              const name = newName.trim();
              const error = validatePartName(name);
              setNewError(error);
              if (!error)
                change.mutate(
                  { action: "create", name },
                  { onSuccess: () => setNewName("") },
                );
            }}
          >
            <Input
              aria-label="새 파트 이름"
              placeholder="새 파트 이름"
              value={newName}
              maxLength={50}
              disabled={change.isPending}
              aria-invalid={newError ? true : undefined}
              aria-describedby={newError ? "new-part-error" : undefined}
              onChange={(event) => {
                setNewName(event.target.value);
                if (newError) setNewError(null);
              }}
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={!newName.trim()}
              loading={
                change.isPending && change.variables?.action === "create"
              }
            >
              만들기
            </Button>
            {newError && (
              <p
                id="new-part-error"
                role="alert"
                className="settings-field-error"
              >
                {newError}
              </p>
            )}
          </form>
        )
      }
    >
      {project.parts.length === 0 ? (
        <EmptyState
          title="파트가 없어요"
          description={
            permissions.manage
              ? "아래에 이름을 적어 첫 파트를 만들어요."
              : "헤드 어드민이나 PM이 만들면 여기에 보여요."
          }
        />
      ) : (
        <PartRows
          project={project}
          editable={permissions.manage}
          change={change}
        />
      )}
      <MutationFeedback error={change.error} success={change.isSuccess} />
    </Panel>
  );
}
