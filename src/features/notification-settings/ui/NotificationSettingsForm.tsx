"use client";

import Link from "next/link";
import { normalizeApiError } from "@/shared/api";
import { ErrorState, Skeleton } from "@/shared/ui";
import {
  useNotificationSettings,
  useUpdateNotificationSetting,
  type NotificationKind,
} from "../api/notification-settings";

const kinds: readonly {
  readonly kind: NotificationKind;
  readonly label: string;
  readonly hint: string;
  /** 팀 공용 설정에만 보인다. */
  readonly teamOnly?: true;
}[] = [
  {
    kind: "ciFailed",
    label: "CI 실패",
    hint: "연결된 PR의 CI가 실패하면 담당자와 PR 작성자를 멘션해요.",
  },
  {
    kind: "reviewOverdue",
    label: "리뷰 24시간 초과",
    hint: "리뷰 요청 후 24시간이 지나도 응답이 없으면 리뷰어를 멘션해요.",
  },
  {
    kind: "deadlineDue",
    label: "마감 하루 전",
    hint: "마감 전날 오전 9시에 완료되지 않은 업무의 담당자를 멘션해요.",
  },
  {
    kind: "serviceDown",
    label: "서비스 다운",
    hint: "헬스체크나 업타임 모니터가 다운을 알리면 팀 채널에 알려요.",
    teamOnly: true,
  },
];

const errors: Readonly<Record<string, string>> = {
  PROJECT_FORBIDDEN: "헤드 어드민 또는 PM만 알림 설정을 바꿀 수 있어요.",
  PROJECT_ARCHIVED: "아카이브된 프로젝트는 설정을 바꿀 수 없어요.",
  ACCESS_DENIED: "헤드 어드민만 팀 공용 알림 설정을 바꿀 수 있어요.",
  PROJECT_NOT_FOUND: "프로젝트가 없거나 조회 권한이 없어요.",
};
const message = (cause: unknown) => {
  const problem = normalizeApiError(cause);
  return errors[problem.code] ?? problem.message;
};
const channelText = {
  NONE: "Discord 채널이 연결되지 않아 알림이 가지 않아요.",
  DISABLED: "Discord 채널 연결이 비활성이라 알림이 가지 않아요.",
} as const;

/** 고정 알림 토글. projectId=null 이면 팀 공용 설정이고 서비스 다운이 더 보인다. */
export function NotificationSettingsForm({
  projectId,
  editable,
  channelHref,
}: {
  readonly projectId: string | null;
  readonly editable: boolean;
  /** 채널이 ACTIVE가 아닐 때 연결 화면으로 보내는 주소. */
  readonly channelHref?: string;
}) {
  const settings = useNotificationSettings(projectId);
  const update = useUpdateNotificationSetting(projectId);
  const shown = kinds.filter(({ teamOnly }) => !teamOnly || projectId === null);
  if (settings.isPending)
    return (
      <div
        role="status"
        aria-label="알림 설정을 불러오는 중"
        className="grid gap-3"
      >
        {shown.map(({ kind }) => (
          <Skeleton key={kind} className="h-10" />
        ))}
      </div>
    );
  if (settings.isError)
    return (
      <ErrorState
        title="알림 설정을 불러오지 못했어요"
        description={message(settings.error)}
        onRetry={() => void settings.refetch()}
      />
    );
  const data = settings.data;
  return (
    <div className="grid gap-4">
      {data.channel !== "ACTIVE" && (
        <p role="status" className="notify-channel">
          <span>{channelText[data.channel]}</span>
          {channelHref && (
            <Link href={channelHref} className="underline underline-offset-2">
              채널 연결
            </Link>
          )}
        </p>
      )}
      <fieldset className="notify-list">
        <legend className="sr-only">알림 종류</legend>
        {shown.map(({ kind, label, hint }) => {
          const id = `notify-${projectId ?? "team"}-${kind}`;
          return (
            <div key={kind} className="notify-row">
              <div className="min-w-0">
                <label htmlFor={id} className="text-sm font-medium">
                  {label}
                </label>
                <p id={`${id}-hint`} className="text-xs text-muted">
                  {hint}
                </p>
              </div>
              <input
                id={id}
                type="checkbox"
                role="switch"
                className="notify-switch"
                checked={data[kind] ?? false}
                aria-describedby={`${id}-hint`}
                disabled={!editable || update.isPending}
                onChange={(event) =>
                  update.mutate({ [kind]: event.currentTarget.checked })
                }
              />
            </div>
          );
        })}
      </fieldset>
      <p className="text-xs text-muted">
        같은 알림은 하루 한 번만 Discord로 가요. 개인 업무와 비공개 원본 업무는
        보내지 않아요.
      </p>
      {update.isError && (
        <p role="alert" className="text-sm text-danger">
          {message(update.error)} 이전 값으로 되돌렸어요.
        </p>
      )}
      {update.isSuccess && (
        <p role="status" className="text-sm">
          알림 설정을 저장했어요.
        </p>
      )}
    </div>
  );
}
