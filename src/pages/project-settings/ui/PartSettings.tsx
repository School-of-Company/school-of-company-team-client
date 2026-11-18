"use client";

import { useState } from "react";
import { getSettingsPermissions } from "@/features/project-settings";
import { useProjectParts } from "../api/parts";
import { validatePartName } from "../model/part-validation";
import { Button, EmptyState, Field, Input, Select } from "@/shared/ui";
import type { SettingsProps } from "../model/props";
import { MutationFeedback } from "./MutationFeedback";

export function PartSettings({ project, user, onSaved }: SettingsProps) {
  const change = useProjectParts(project.id, onSaved);
  const permissions = getSettingsPermissions(user, project);
  const [validation, setValidation] = useState<string | null>(null);
  function submitName(name: string, partId?: string) {
    if (!permissions.manage || change.isPending) return;
    const error = validatePartName(name);
    setValidation(error);
    if (!error)
      change.mutate(
        partId
          ? { action: "rename", partId, name }
          : { action: "create", name },
      );
  }
  return (
    <div className="grid gap-6">
      <p className="text-sm text-muted">
        참여자는 여러 파트에 속할 수 있습니다. 파트 리더는 자기 파트 구성원만
        배정·해제합니다.
      </p>
      {project.parts.length === 0 && (
        <EmptyState
          title="파트가 없습니다"
          description="헤드 어드민 또는 PM이 파트를 만들 수 있습니다."
        />
      )}
      {project.parts.map((part) => (
        <section
          key={part.id}
          aria-labelledby={`part-${part.id}`}
          className="grid gap-4 border-b border-border pb-6"
        >
          <h3
            id={`part-${part.id}`}
            className="text-lg font-semibold break-all"
          >
            {part.name}
          </h3>
          {permissions.manage && (
            <>
              <form
                className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitName(
                    String(
                      new FormData(event.currentTarget).get("name") ?? "",
                    ).trim(),
                    part.id,
                  );
                }}
              >
                <Field id={`part-name-${part.id}`} label="파트 이름">
                  <Input
                    id={`part-name-${part.id}`}
                    name="name"
                    defaultValue={part.name}
                    maxLength={50}
                    required
                    disabled={change.isPending}
                  />
                </Field>
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={change.isPending}
                >
                  이름 변경
                </Button>
              </form>
              <Field id={`part-leader-${part.id}`} label="파트 리더">
                <Select
                  id={`part-leader-${part.id}`}
                  value={part.leaderUserId ?? ""}
                  disabled={change.isPending}
                  onChange={(event) =>
                    change.mutate({
                      action: "leader",
                      partId: part.id,
                      userId: event.target.value || null,
                    })
                  }
                >
                  <option value="">미지정</option>
                  {project.members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          )}
          {!permissions.manage && (
            <p className="text-sm text-muted">
              리더:{" "}
              {project.members.find(
                (member) => member.userId === part.leaderUserId,
              )?.name ?? "미지정"}
            </p>
          )}
          {part.memberUserIds.length === 0 ? (
            <p className="text-sm text-muted">배정된 구성원이 없습니다.</p>
          ) : (
            <ul className="grid gap-2">
              {part.memberUserIds.map((userId) => (
                <li
                  key={userId}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="break-all">
                    {project.members.find((member) => member.userId === userId)
                      ?.name ?? "참여자"}
                  </span>
                  {permissions.assignPartMembers(part.leaderUserId) && (
                    <Button
                      variant="ghost"
                      disabled={change.isPending}
                      aria-label={`${part.name}에서 ${project.members.find((member) => member.userId === userId)?.name ?? "참여자"} 해제`}
                      onClick={() =>
                        change.mutate({
                          action: "remove",
                          partId: part.id,
                          userId,
                        })
                      }
                    >
                      배정 해제
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {permissions.assignPartMembers(part.leaderUserId) && (
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (change.isPending) return;
                const userId = String(
                  new FormData(event.currentTarget).get("userId") ?? "",
                );
                if (project.members.some((member) => member.userId === userId))
                  change.mutate({ action: "add", partId: part.id, userId });
              }}
            >
              <Field
                id={`part-member-${part.id}`}
                label="배정할 프로젝트 참여자"
              >
                <Select
                  id={`part-member-${part.id}`}
                  name="userId"
                  defaultValue=""
                  required
                  disabled={change.isPending}
                >
                  <option value="" disabled>
                    참여자 선택
                  </option>
                  {project.members
                    .filter(
                      (member) => !part.memberUserIds.includes(member.userId),
                    )
                    .map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Button
                type="submit"
                variant="secondary"
                disabled={
                  change.isPending ||
                  part.memberUserIds.length === project.members.length
                }
              >
                파트에 배정
              </Button>
            </form>
          )}
          {permissions.manage && (
            <div className="grid gap-2">
              <p className="text-sm text-muted">
                파트를 삭제해도 업무는 보존되며 해당 파트 배정만 해제됩니다.
              </p>
              <Button
                variant="ghost"
                disabled={change.isPending}
                aria-label={`${part.name} 파트 삭제`}
                onClick={() =>
                  change.mutate({ action: "delete", partId: part.id })
                }
              >
                파트 삭제
              </Button>
            </div>
          )}
        </section>
      ))}
      {permissions.manage && (
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
