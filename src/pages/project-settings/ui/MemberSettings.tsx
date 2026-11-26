"use client";

import { useState } from "react";
import { useProjectMembers } from "../api/members";
import {
  getSettingsPermissions,
  useAssignPm,
} from "@/features/project-settings";
import { Badge, Button, EmptyState, Field, Select } from "@/shared/ui";
import type { SettingsProps } from "../model/props";
import { MutationFeedback } from "./MutationFeedback";

export function MemberSettings({
  project,
  user,
  onSaved,
  candidates,
}: SettingsProps) {
  const members = useProjectMembers(project.id, onSaved);
  const pm = useAssignPm(project.id, onSaved);
  const permissions = getSettingsPermissions(user, project);
  const [candidate, setCandidate] = useState("");
  const [editing, setEditing] = useState(false);
  const pending = members.isPending || pm.isPending;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          PM:{" "}
          {candidates.find((item) => item.id === project.pmUserId)?.name ??
            project.members.find((item) => item.userId === project.pmUserId)
              ?.name ??
            "미지정"}
        </p>
        {permissions.manage && (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => setEditing(!editing)}
          >
            {editing ? "편집 마침" : "참여자와 PM 편집"}
          </Button>
        )}
      </div>
      {editing && user.role === "LEAD" && (
        <div className="grid gap-2">
          <Field
            id="project-pm"
            label="PM"
            hint="PM은 한 명이에요. 바뀐 PM은 참여자로 남아요."
          >
            <Select
              id="project-pm"
              value={project.pmUserId ?? ""}
              disabled={!permissions.assignPm || pending}
              onChange={(event) => pm.mutate(event.target.value || null)}
              aria-describedby="project-pm-hint"
            >
              <option value="">미지정</option>
              {candidates.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.username})
                </option>
              ))}
            </Select>
          </Field>
          <MutationFeedback error={pm.error} success={pm.isSuccess} />
        </div>
      )}
      {project.members.length === 0 ? (
        <EmptyState title="참여자가 없습니다" />
      ) : (
        <ul className="divide-y divide-border">
          {project.members.map((member) => (
            <li
              key={member.userId}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="break-all">{member.name}</span>
                {member.userId === project.pmUserId && <Badge>PM</Badge>}
              </div>
              {editing && permissions.manage && (
                <Button
                  variant="ghost"
                  disabled={pending || member.userId === project.pmUserId}
                  title={
                    member.userId === project.pmUserId
                      ? "PM은 먼저 교체하거나 해제해야 합니다."
                      : undefined
                  }
                  aria-label={`${member.name} 참여자 제외`}
                  onClick={() =>
                    members.mutate({ action: "remove", userId: member.userId })
                  }
                >
                  제외
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && permissions.manage && (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (pending || !candidate.trim()) return;
            members.mutate(
              { action: "add", userId: candidate.trim() },
              { onSuccess: () => setCandidate("") },
            );
          }}
        >
          <Field id="project-member" label="추가할 활성 팀원">
            <Select
              id="project-member"
              name="userId"
              value={candidate}
              onChange={(event) => setCandidate(event.target.value)}
              disabled={pending}
              required
            >
              <option value="" disabled>
                팀원 선택
              </option>
              {candidates
                .filter(
                  (item) =>
                    !project.members.some(
                      (member) => member.userId === item.id,
                    ),
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.username})
                  </option>
                ))}
            </Select>
          </Field>
          <Button type="submit" variant="secondary" loading={members.isPending}>
            참여자 추가
          </Button>
          <p className="text-sm text-muted">
            PM을 제외하려면 헤드 어드민이 먼저 교체하거나 해제해야 합니다.
            참여자 제외 시 기록은 보존되며 업무 배정, 파트 소속은 해제됩니다.
          </p>
        </form>
      )}
      <MutationFeedback error={members.error} success={members.isSuccess} />
    </div>
  );
}
