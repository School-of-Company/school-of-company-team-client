"use client";

import { useState } from "react";
import { normalizeApiError } from "@/shared/api";
import {
  Badge,
  Button,
  Checkbox,
  ErrorState,
  Field,
  Input,
  Spinner,
} from "@/shared/ui";
import { useDiscordChannel, useLinkDiscordChannel } from "../api/integrations";
import { validateDiscordChannel } from "../model/validation";

export function DiscordChannelForm({
  projectId,
  membersOnly = false,
  disabled = false,
}: {
  readonly projectId: string | null;
  readonly membersOnly?: boolean;
  readonly disabled?: boolean;
}) {
  const channel = useDiscordChannel(projectId, true);
  const link = useLinkDiscordChannel(projectId);
  const [validation, setValidation] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const prefix = projectId === null ? "team-channel" : "project-channel";
  if (channel.isPending) return <Spinner label="Discord 채널 불러오는 중" />;
  if (channel.isError)
    return (
      <ErrorState
        description={normalizeApiError(channel.error).message}
        onRetry={() => void channel.refetch()}
      />
    );
  const statusLabels = {
    NOT_CONFIGURED: "미연결",
    ACTIVE: "활성",
    DISABLED: "비활성",
  } as const;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge>{statusLabels[channel.data.status]}</Badge>
        <span className="text-sm break-all text-muted">
          {channel.data.channelId ?? "연결된 채널이 없습니다."}
        </span>
      </div>
      {channel.data.status === "DISABLED" && (
        <div role="status" className="grid gap-2 text-sm">
          <p>비활성 사유: {channel.data.disabledReason}</p>
          <p>{channel.data.requiredAction}</p>
        </div>
      )}
      <p className="text-sm text-muted">
        Discord 역할·채널·기존 스레드 권한은 자동으로 변경되지 않습니다. 공개
        범위나 참여자가 바뀌면 관리자가 직접 점검한 뒤 다시 연결하세요.
      </p>
      {!disabled && !editing && (
        <Button
          variant="secondary"
          className="justify-self-start"
          onClick={() => {
            link.reset();
            setEditing(true);
          }}
        >
          Discord 채널 편집
        </Button>
      )}
      {link.isSuccess && !editing && (
        <p role="status" className="text-sm">
          채널 검증을 마쳤습니다. 현재 상태: {statusLabels[link.data.status]}
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
              hint="Discord 개발자 모드 → 채널 우클릭 → ID 복사"
            >
              <Input
                id={prefix}
                name="channelId"
                inputMode="numeric"
                pattern="[0-9]{17,20}"
                required
                defaultValue={channel.data.channelId ?? ""}
                aria-describedby={`${prefix}-hint`}
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
                  이 채널을 볼 수 있는 역할·사용자를 프로젝트 참여자로 제한했고,
                  기존 스레드 권한도 직접 점검했습니다.
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
            <p role="status" className="text-sm">
              채널 검증을 마쳤습니다. 현재 상태:{" "}
              {statusLabels[link.data.status]}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
