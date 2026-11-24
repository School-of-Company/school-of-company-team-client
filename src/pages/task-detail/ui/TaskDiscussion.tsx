"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { taskGithubQueries } from "@/features/link-github-issue";
import { normalizeApiError } from "@/shared/api";
import { Button, Field, Input, useToast } from "@/shared/ui";
import { taskDiscordApi, type Discussion } from "../api/discord";

const PRIVATE_SOURCE_NOTICE =
  "비공개 저장소에서 가져온 업무라 Discord에서 논의할 수 없어요. 공유 채널에서는 원본 저장소 권한이 없는 사람에게도 제목, 내용이 보일 수 있어요.";

const messages: Readonly<Record<string, string>> = {
  DISCORD_NOT_CONFIGURED:
    "Discord 연동이 설정되지 않았습니다. 운영자에게 문의해 주세요.",
  DISCORD_CHANNEL_NOT_CONFIGURED:
    "논의 채널이 없습니다. 관리자에게 채널 연결을 요청해 주세요.",
  DISCORD_LINK_DISABLED:
    "연결이 비활성화되었습니다. 관리자가 Discord 채널, 스레드의 역할과 사용자 권한을 직접 정리한 후 채널을 다시 연결해야 합니다.",
  DISCORD_THREAD_CREATING:
    "스레드를 생성하고 있습니다. 잠시 후 다시 시도해 주세요.",
  DISCORD_RESULT_UNKNOWN:
    "요청 결과를 확인 중입니다. 잠시 후 다시 시도해 주세요.",
  DISCORD_THREAD_NEEDS_CHECK:
    "스레드 확인이 필요합니다. 관리자에게 복구를 요청해 주세요.",
  DISCORD_THREAD_DELETED:
    "스레드가 삭제되었습니다. 관리자에게 복구를 요청해 주세요.",
  DISCORD_BOT_MISSING_PERMISSIONS:
    "봇의 채널, 스레드 접근 권한이 부족합니다. 관리자에게 권한 점검을 요청해 주세요.",
  PROJECT_ARCHIVED: "아카이브된 프로젝트에는 새 스레드를 만들 수 없습니다.",
};

export function TaskDiscussion({
  taskId,
  manages,
  onAccessLost,
}: {
  readonly taskId: string;
  readonly manages: boolean;
  readonly onAccessLost: (error: unknown) => void;
}) {
  const toast = useToast();
  // 상세 패널과 같은 쿼리 키라 추가 요청 없이 캐시를 공유한다.
  const restricted =
    useQuery(taskGithubQueries.detail(taskId)).data?.source
      ?.discordRestricted === true;
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [threadId, setThreadId] = useState("");
  async function open() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      setDiscussion(await taskDiscordApi.open(taskId));
    } catch (cause) {
      const problem = normalizeApiError(cause);
      setError(messages[problem.code] ?? problem.message);
      setRecovery(
        problem.code === "DISCORD_THREAD_NEEDS_CHECK" ||
          problem.code === "DISCORD_THREAD_DELETED",
      );
      if (problem.status === 403 || problem.status === 404) onAccessLost(cause);
    } finally {
      setPending(false);
    }
  }
  async function recover() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await taskDiscordApi.recover(taskId, threadId || null);
      setDiscussion(null);
      setRecovery(false);
      toast("복구했습니다. 논의 열기를 다시 눌러 주세요.", "success");
    } catch (cause) {
      setError(normalizeApiError(cause).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="grid gap-4 border-t border-border pt-6">
      <h2 className="text-lg font-semibold">Discord 논의</h2>
      {restricted && !discussion ? (
        <p className="text-sm text-muted">{PRIVATE_SOURCE_NOTICE}</p>
      ) : discussion ? (
        <div className="grid gap-2">
          <a
            className="ui-button ui-button-secondary justify-self-start"
            href={discussion.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord에서 논의 열기
          </a>
          {discussion.archived && (
            <p className="text-sm text-muted">
              보관된 스레드입니다.{" "}
              {discussion.locked
                ? "잠겨 있어 관리자의 재개방이 필요합니다."
                : "Discord에서 메시지를 보내면 다시 열 수 있습니다."}
            </p>
          )}
          {!discussion.verified && (
            <p className="text-sm text-muted">
              저장된 링크입니다. 원본 스레드 상태는 확인하지 않았습니다.
            </p>
          )}
        </div>
      ) : (
        <Button
          variant="secondary"
          loading={pending}
          className="justify-self-start"
          onClick={() => void open()}
        >
          논의 열기
        </Button>
      )}
      {!restricted && (
        <p className="text-sm text-muted">
          최초 클릭 시 스레드를 만들고, 이후 같은 스레드로 이동합니다.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {recovery && manages && (
        <div className="grid gap-3">
          <Field
            id="recovery-thread"
            label="복구할 기존 스레드 ID (선택)"
            hint="비우고 복구하면 기존 연결을 해제합니다. 이후 논의 열기로 새 스레드를 만듭니다. 원본 대화는 삭제하지 않습니다."
          >
            <Input
              id="recovery-thread"
              value={threadId}
              inputMode="numeric"
              pattern="[0-9]{17,20}"
              onChange={(event) => setThreadId(event.target.value)}
            />
          </Field>
          <Button
            variant="secondary"
            loading={pending}
            onClick={() => void recover()}
            disabled={!!threadId && !/^[0-9]{17,20}$/.test(threadId)}
          >
            스레드 복구
          </Button>
        </div>
      )}
    </section>
  );
}
