"use client";

import { useEffect, useState } from "react";
import { normalizeApiError } from "@/shared/api";
import {
  Badge,
  Button,
  Checkbox,
  ErrorState,
  Field,
  InfoTip,
  Input,
  Skeleton,
} from "@/shared/ui";
import { useDiscordChannel, useLinkDiscordChannel } from "../api/integrations";
import { validateDiscordChannel } from "../model/validation";

export function DiscordChannelForm({
  projectId,
  membersOnly = false,
  disabled = false,
  onDirtyChange,
}: {
  readonly projectId: string | null;
  readonly membersOnly?: boolean;
  readonly disabled?: boolean;
  /** 고치던 채널 ID 가 저장된 값과 다르면 true(나가기 경고용). */
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const channel = useDiscordChannel(projectId, true);
  const link = useLinkDiscordChannel(projectId);
  const [validation, setValidation] = useState<string | null>(null);
  const [editing, setEditingState] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const setEditing = (next: boolean) => {
    setDraft(null);
    setEditingState(next);
  };
  const dirty =
    editing &&
    draft !== null &&
    draft.trim() !== (channel.data?.channelId ?? "");
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  const prefix = projectId === null ? "team-channel" : "project-channel";
  if (channel.isPending)
    return (
      <div role="status" aria-label="Discord 채널 불러오는 중">
        <Skeleton className="h-10" />
      </div>
    );
  if (channel.isError)
    return (
      <ErrorState
        description={normalizeApiError(channel.error).message}
        onRetry={() => void channel.refetch()}
      />
    );
  const statusLabels = {
    NOT_CONFIGURED: "연결 안 됨",
    ACTIVE: "연결됨",
    DISABLED: "꺼짐",
  } as const;
  const tone = {
    NOT_CONFIGURED: undefined,
    ACTIVE: "badge-green",
    DISABLED: "badge-red",
  } as const;
  return (
    <div className="grid gap-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Badge className={tone[channel.data.status]}>
            {statusLabels[channel.data.status]}
          </Badge>
          <span className="min-w-0 truncate font-mono text-sm">
            {channel.data.channelId ?? (
              <span className="font-sans text-muted">연결된 채널이 없어요</span>
            )}
          </span>
          <InfoTip label="Discord 권한 설명">
            Discord 권한은 자동으로 바뀌지 않아요. 공개 범위나 참여자가 바뀌면
            권한을 확인하고 다시 연결해 주세요.
          </InfoTip>
        </div>
        {!disabled && !editing && (
          <Button
            variant="secondary"
            className="ui-button-sm"
            onClick={() => {
              link.reset();
              setEditing(true);
            }}
          >
            {channel.data.channelId ? "채널 변경" : "채널 연결"}
          </Button>
        )}
      </div>
      {channel.data.status === "DISABLED" && (
        <div role="status" className="grid gap-1 text-xs text-danger">
          <p>꺼진 이유: {channel.data.disabledReason}</p>
          <p>{channel.data.requiredAction}</p>
        </div>
      )}
      {link.isSuccess && !editing && (
        <p role="status" className="text-xs text-muted">
          채널을 확인했어요. 지금 상태: {statusLabels[link.data.status]}
        </p>
      )}
      {editing && (
        <form
          key={channel.data.channelId}
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (disabled || link.isPending) return;
            const form = new FormData(event.currentTarget);
            const channelId = String(form.get("channelId") ?? "").trim();
            const privacyConfirmed = form.get("privacyConfirmed") === "on";
            const error = validateDiscordChannel(
              channelId,
              membersOnly,
              privacyConfirmed,
            );
            setValidation(error);
            if (!error)
              link.mutate(
                { channelId, privacyConfirmed },
                { onSuccess: () => setEditing(false) },
              );
          }}
        >
          <fieldset
            disabled={disabled || link.isPending}
            className="grid min-w-0 gap-4"
          >
            <Field
              id={prefix}
              label="Discord 채널 ID"
              hint="Discord 개발자 모드에서 채널을 우클릭하고 ID 복사"
            >
              <Input
                id={prefix}
                name="channelId"
                inputMode="numeric"
                pattern="[0-9]{17,20}"
                required
                defaultValue={channel.data.channelId ?? ""}
                aria-describedby={`${prefix}-hint`}
                onChange={(event) => setDraft(event.target.value)}
              />
            </Field>
            {membersOnly && (
              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  name="privacyConfirmed"
                  required
                  className="mt-1 shrink-0"
                />
                <span>
                  이 채널을 볼 수 있는 역할, 사용자를 프로젝트 참여자로
                  제한했고, 기존 스레드 권한도 직접 점검했어요.
                </span>
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                variant="secondary"
                loading={link.isPending}
              >
                검증 후 연결
              </Button>
              <Button
                variant="ghost"
                disabled={link.isPending}
                onClick={() => setEditing(false)}
              >
                취소
              </Button>
            </div>
          </fieldset>
          {validation && (
            <p role="alert" className="text-sm text-danger">
              {validation}
            </p>
          )}
          {link.isError && (
            <p role="alert" className="text-sm text-danger">
              {normalizeApiError(link.error).message}
            </p>
          )}
          {link.isSuccess && (
            <p role="status" className="text-xs text-muted">
              채널을 확인했어요. 지금 상태: {statusLabels[link.data.status]}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
