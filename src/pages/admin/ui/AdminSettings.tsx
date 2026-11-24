"use client";

import { useAdminUsers, useAdminUserChange } from "../api/users";
import { DiscordChannelForm } from "@/features/project-integrations";
import { IntakeFormSettings } from "@/features/manage-intake-forms";
import { NotificationSettingsForm } from "@/features/notification-settings";
import { settingsErrorMessage } from "@/features/project-settings";
import { normalizeApiError } from "@/shared/api";
import { Badge, Button, EmptyState, ErrorState, Spinner } from "@/shared/ui";

export function AdminSettings({
  user,
}: {
  readonly user: { readonly id: string; readonly role: string };
}) {
  const users = useAdminUsers(user.role === "LEAD");
  const change = useAdminUserChange();
  if (user.role !== "LEAD")
    return (
      <ErrorState
        title="관리자 권한이 필요합니다"
        description="헤드 어드민만 조직 사용자와 프로젝트를 관리할 수 있습니다."
      />
    );
  if (users.isPending) return <Spinner label="조직 사용자 불러오는 중" />;
  if (users.isError)
    return (
      <ErrorState
        description={settingsErrorMessage(normalizeApiError(users.error))}
        onRetry={() => void users.refetch()}
      />
    );
  const activeLeads = users.data.filter(
    (item) => item.role === "LEAD" && item.status === "ACTIVE",
  ).length;
  const statuses = {
    PENDING: "승인 대기",
    ACTIVE: "활성",
    REJECTED: "가입 거절",
    SUSPENDED: "이용 중지",
  } as const;
  return (
    <div className="grid gap-10">
      <section className="grid gap-5" aria-labelledby="admin-users-heading">
        <h2 id="admin-users-heading" className="text-xl font-semibold">
          조직 사용자
        </h2>
        <p className="text-sm text-muted">
          이용 중지 시 업무와 기록은 보존되고 해당 사용자의 담당 배정은
          해제됩니다. 마지막 활성 헤드 어드민은 해제·중지할 수 없습니다.
        </p>
        {users.data.length === 0 ? (
          <EmptyState title="조직 사용자가 없습니다" />
        ) : (
          <ul className="divide-y divide-border">
            {users.data.map((item) => {
              const lastLead =
                item.status === "ACTIVE" &&
                item.role === "LEAD" &&
                activeLeads === 1;
              const self = item.id === user.id;
              return (
                <li key={item.id} className="grid gap-3 py-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium break-all">{item.name}</span>
                    <span className="text-sm break-all text-muted">
                      {item.username}
                    </span>
                    <Badge>{statuses[item.status]}</Badge>
                    {item.role === "LEAD" && <Badge>헤드 어드민</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.status === "PENDING" && (
                      <>
                        <Button
                          variant="secondary"
                          disabled={change.isPending}
                          aria-label={`${item.name} 가입 승인`}
                          onClick={() =>
                            change.mutate({
                              action: "approve",
                              userId: item.id,
                            })
                          }
                        >
                          승인
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={change.isPending}
                          aria-label={`${item.name} 가입 거절`}
                          onClick={() =>
                            change.mutate({ action: "reject", userId: item.id })
                          }
                        >
                          거절
                        </Button>
                      </>
                    )}
                    {item.status === "ACTIVE" && (
                      <>
                        <Button
                          variant="secondary"
                          disabled={
                            change.isPending ||
                            (item.role === "LEAD" && (lastLead || self))
                          }
                          aria-label={`${item.name} ${item.role === "LEAD" ? "관리자 해제" : "관리자 지정"}`}
                          onClick={() =>
                            change.mutate({
                              action: "role",
                              userId: item.id,
                              role: item.role === "LEAD" ? "MEMBER" : "LEAD",
                            })
                          }
                        >
                          {item.role === "LEAD" ? "관리자 해제" : "관리자 지정"}
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={change.isPending || lastLead || self}
                          aria-label={`${item.name} 이용 중지`}
                          onClick={() =>
                            change.mutate({
                              action: "suspend",
                              userId: item.id,
                            })
                          }
                        >
                          이용 중지
                        </Button>
                      </>
                    )}
                    {item.status === "SUSPENDED" && (
                      <Button
                        variant="secondary"
                        disabled={change.isPending}
                        aria-label={`${item.name} 이용 재개`}
                        onClick={() =>
                          change.mutate({
                            action: "reactivate",
                            userId: item.id,
                          })
                        }
                      >
                        이용 재개
                      </Button>
                    )}
                  </div>
                  {lastLead && (
                    <p className="text-sm text-muted">
                      마지막 활성 헤드 어드민이므로 해제·이용 중지가 차단됩니다.
                    </p>
                  )}
                  {self && !lastLead && (
                    <p className="text-sm text-muted">
                      자기 계정의 관리자 해제·이용 중지는 할 수 없습니다.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {change.isPending && <Spinner label="사용자 상태 변경 중" />}
        {change.isError && (
          <p role="alert" className="text-sm text-danger">
            {settingsErrorMessage(normalizeApiError(change.error))}
          </p>
        )}
        {change.isSuccess && (
          <p role="status" className="text-sm">
            사용자 상태를 변경했습니다.
          </p>
        )}
      </section>
      <section className="grid gap-5" aria-labelledby="team-channel-heading">
        <h2 id="team-channel-heading" className="text-xl font-semibold">
          팀 공용 Discord 채널
        </h2>
        <DiscordChannelForm projectId={null} />
      </section>
      <section className="grid gap-5" aria-labelledby="team-notify-heading">
        <h2 id="team-notify-heading" className="text-xl font-semibold">
          팀 공용 업무 알림
        </h2>
        <NotificationSettingsForm projectId={null} editable />
      </section>
      <section className="grid gap-5" aria-labelledby="org-intake-heading">
        <h2 id="org-intake-heading" className="text-xl font-semibold">
          조직 단위 요구사항 접수 양식
        </h2>
        <IntakeFormSettings projectId={null} editable />
      </section>
    </div>
  );
}
