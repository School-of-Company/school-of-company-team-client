"use client";

import { useState } from "react";
import { useProjectMembers } from "../api/members";
import {
  getSettingsPermissions,
  useAssignPm,
} from "@/features/project-settings";
import {
  Avatar,
  Badge,
  Button,
  DisabledReason,
  EmptyState,
  Select,
} from "@/shared/ui";
import type { SettingsProps } from "../model/props";
import { MutationFeedback } from "./MutationFeedback";
import { Panel } from "./Panel";

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
  const pending = members.isPending || pm.isPending;
  const usernames = new Map(candidates.map((item) => [item.id, item.username]));
  const addable = candidates.filter(
    (item) => !project.members.some((member) => member.userId === item.id),
  );
  return (
    <Panel
      title="참여자"
      count={project.members.length}
      info="PM은 한 명이고 헤드 어드민이 정해요. 바꾸거나 해제한 PM은 참여자로 남아요. 참여자를 제외해도 기록은 남고, 업무 배정과 파트 소속은 풀려요."
      actions={
        project.pmUserId === null && (
          <span className="text-xs text-muted">PM 미지정</span>
        )
      }
      footer={
        permissions.manage && (
          <form
            className="settings-inline-form w-full"
            onSubmit={(event) => {
              event.preventDefault();
              if (pending || !candidate) return;
              members.mutate(
                { action: "add", userId: candidate },
                { onSuccess: () => setCandidate("") },
              );
            }}
          >
            <Select
              aria-label="추가할 팀원"
              value={candidate}
              onChange={(event) => setCandidate(event.target.value)}
              disabled={pending || addable.length === 0}
            >
              <option value="">
                {addable.length === 0 ? "추가할 팀원이 없어요" : "팀원 선택"}
              </option>
              {addable.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} @{item.username}
                </option>
              ))}
            </Select>
            <Button
              type="submit"
              variant="secondary"
              disabled={!candidate}
              loading={members.isPending && members.variables?.action === "add"}
            >
              추가
            </Button>
          </form>
        )
      }
    >
      {project.members.length === 0 ? (
        <EmptyState title="참여자가 없어요" />
      ) : (
        <ul className="settings-list" aria-label="참여자">
          {project.members.map((member) => {
            const isPm = member.userId === project.pmUserId;
            const username = usernames.get(member.userId);
            return (
              <li key={member.userId} className="settings-list-row">
                <Avatar name={member.name} />
                <div className="settings-list-main">
                  <span className="settings-list-name">
                    <span>{member.name}</span>
                  </span>
                  {username && (
                    <span className="settings-list-meta">@{username}</span>
                  )}
                </div>
                <div className="settings-list-actions">
                  {permissions.assignPm ? (
                    <Select
                      aria-label={`${member.name} 역할`}
                      value={isPm ? "PM" : "MEMBER"}
                      disabled={pending}
                      onChange={(event) =>
                        pm.mutate(
                          event.target.value === "PM" ? member.userId : null,
                        )
                      }
                    >
                      <option value="MEMBER">참여자</option>
                      <option value="PM">PM</option>
                    </Select>
                  ) : (
                    isPm && <Badge>PM</Badge>
                  )}
                  {permissions.manage && (
                    <DisabledReason
                      reason={
                        isPm
                          ? "PM은 먼저 다른 사람으로 바꾸거나 해제해야 제외할 수 있어요"
                          : null
                      }
                    >
                      <Button
                        variant="ghost"
                        className="ui-button-sm"
                        disabled={pending || isPm}
                        aria-label={`${member.name} 참여자 제외`}
                        onClick={() =>
                          members.mutate({
                            action: "remove",
                            userId: member.userId,
                          })
                        }
                      >
                        제외
                      </Button>
                    </DisabledReason>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <MutationFeedback
        error={members.error ?? pm.error}
        success={members.isSuccess || pm.isSuccess}
      />
    </Panel>
  );
}
