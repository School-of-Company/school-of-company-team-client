"use client";

import { useState } from "react";
import type { ProjectDetail } from "@/entities/project";
import { Button, Icon, Input, Select } from "@/shared/ui";
import { useProjectParts } from "../api/parts";
import { validatePartName } from "../model/part-validation";

/** 파트 한 줄: 이름과 구성원 칩, 오른쪽에 구성원 추가와 이름 변경, 삭제. */
export function PartRows({
  project,
  editable,
  change,
}: {
  readonly project: ProjectDetail;
  readonly editable: boolean;
  readonly change: ReturnType<typeof useProjectParts>;
}) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const nameOf = (userId: string) =>
    project.members.find((member) => member.userId === userId)?.name ??
    "참여자";
  return (
    <ul className="settings-list" aria-label="파트">
      {project.parts.map((part) => {
        const unassigned = project.members.filter(
          (member) => !part.memberUserIds.includes(member.userId),
        );
        if (editable && renaming === part.id)
          return (
            <li key={part.id} className="settings-list-row">
              <form
                noValidate
                className="settings-inline-form w-full"
                data-actions="2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (change.isPending) return;
                  const name = String(
                    new FormData(event.currentTarget).get("name") ?? "",
                  ).trim();
                  const error = validatePartName(name);
                  setRenameError(error);
                  if (!error)
                    change.mutate(
                      { action: "rename", partId: part.id, name },
                      { onSuccess: () => setRenaming(null) },
                    );
                }}
              >
                <Input
                  name="name"
                  aria-label={`${part.name} 새 이름`}
                  defaultValue={part.name}
                  maxLength={50}
                  autoFocus
                  disabled={change.isPending}
                  aria-invalid={renameError ? true : undefined}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  className="ui-button-sm"
                  loading={change.isPending}
                >
                  저장
                </Button>
                <Button
                  variant="ghost"
                  className="ui-button-sm"
                  disabled={change.isPending}
                  onClick={() => setRenaming(null)}
                >
                  취소
                </Button>
                {renameError && (
                  <p role="alert" className="settings-field-error">
                    {renameError}
                  </p>
                )}
              </form>
            </li>
          );
        return (
          <li
            key={part.id}
            className="settings-list-row"
            data-wrap
            aria-label={part.name}
          >
            <div className="settings-list-main">
              <span className="settings-list-name">
                <span>{part.name}</span>
              </span>
              {part.memberUserIds.length === 0 ? (
                <span className="settings-list-meta">구성원 없음</span>
              ) : (
                <ul
                  className="settings-chips"
                  aria-label={`${part.name} 구성원`}
                >
                  {part.memberUserIds.map((userId) => (
                    <li key={userId} className="settings-chip">
                      {nameOf(userId)}
                      {editable && (
                        <button
                          type="button"
                          aria-label={`${part.name}에서 ${nameOf(userId)} 해제`}
                          disabled={change.isPending}
                          onClick={() =>
                            change.mutate({
                              action: "remove",
                              partId: part.id,
                              userId,
                            })
                          }
                        >
                          <Icon name="close" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {editable && (
              <div className="settings-list-actions">
                {unassigned.length > 0 && (
                  <Select
                    aria-label={`${part.name}에 구성원 추가`}
                    value=""
                    disabled={change.isPending}
                    onChange={(event) => {
                      const userId = event.target.value;
                      if (userId)
                        change.mutate({
                          action: "add",
                          partId: part.id,
                          userId,
                        });
                    }}
                  >
                    <option value="">구성원 추가</option>
                    {unassigned.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.name}
                      </option>
                    ))}
                  </Select>
                )}
                <Button
                  variant="ghost"
                  className="ui-button-sm"
                  disabled={change.isPending}
                  aria-label={`${part.name} 이름 변경`}
                  onClick={() => {
                    setRenameError(null);
                    setRenaming(part.id);
                  }}
                >
                  이름 변경
                </Button>
                <Button
                  variant="ghost"
                  className="ui-button-sm"
                  disabled={change.isPending}
                  aria-label={`${part.name} 파트 삭제`}
                  onClick={() =>
                    change.mutate({ action: "delete", partId: part.id })
                  }
                >
                  삭제
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
