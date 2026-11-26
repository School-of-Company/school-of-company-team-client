"use client";

import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  incidentApi,
  incidentErrorMessage,
  incidentKeys,
  type Discussion,
} from "@/entities/incident";
import { normalizeApiError } from "@/shared/api";
import { Button, Field, Input } from "@/shared/ui";

/**
 * 팀 채널에 사고당 스레드 하나(D7-13). 활성 팀원 누구나 연다.
 * 시작 메시지에는 제목·심각도·상태·사고 링크만 나간다(요약·타임라인·서비스·업무는 보내지 않는다).
 */
export function IncidentDiscord({
  incidentId,
  threadUrl,
  headAdmin,
}: {
  readonly incidentId: string;
  readonly threadUrl: string | null;
  readonly headAdmin: boolean;
}) {
  const id = useId();
  const client = useQueryClient();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    readonly text: string;
    readonly error: boolean;
  } | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [threadId, setThreadId] = useState("");
  const url = discussion?.url ?? threadUrl;
  async function open() {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const result = await incidentApi.openThread(incidentId);
      setDiscussion(result);
      await client.invalidateQueries({
        queryKey: incidentKeys.detail(incidentId),
      });
    } catch (cause) {
      const problem = normalizeApiError(cause);
      setMessage({ text: incidentErrorMessage(cause), error: true });
      setRecovery(
        problem.code === "DISCORD_THREAD_NEEDS_CHECK" ||
          problem.code === "DISCORD_THREAD_DELETED",
      );
    } finally {
      setPending(false);
    }
  }
  async function recover() {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      await incidentApi.recoverThread(incidentId, threadId || null);
      setDiscussion(null);
      setRecovery(false);
      setThreadId("");
      setMessage({
        text: "복구했습니다. 스레드 열기를 다시 눌러 주세요.",
        error: false,
      });
      await client.invalidateQueries({
        queryKey: incidentKeys.detail(incidentId),
      });
    } catch (cause) {
      setMessage({ text: incidentErrorMessage(cause), error: true });
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="grid gap-2">
      {url ? (
        <a
          className="ui-button ui-button-secondary ui-button-sm justify-self-start"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Discord 스레드로 이동
        </a>
      ) : (
        <Button
          variant="secondary"
          className="ui-button-sm justify-self-start"
          loading={pending}
          onClick={() => void open()}
        >
          Discord 스레드 열기
        </Button>
      )}
      {discussion?.archived && (
        <p className="text-xs text-muted">
          보관된 스레드입니다.{" "}
          {discussion.locked
            ? "잠겨 있어 관리자의 재개방이 필요합니다."
            : "Discord에서 메시지를 보내면 다시 열립니다."}
        </p>
      )}
      {!url && (
        <p className="text-xs text-muted">
          팀 채널에 제목, 심각도, 상태와 이 화면 링크만 올립니다.
        </p>
      )}
      {message && (
        <p
          role={message.error ? "alert" : "status"}
          className={`text-sm ${message.error ? "text-danger" : ""}`}
        >
          {message.text}
        </p>
      )}
      {recovery && headAdmin && (
        <div className="grid gap-2">
          <Field
            id={`${id}-thread`}
            label="복구할 기존 스레드 ID"
            hint="비우고 복구하면 기존 연결만 끊어요. 원래 대화는 남아요."
          >
            <Input
              id={`${id}-thread`}
              value={threadId}
              inputMode="numeric"
              pattern="[0-9]{17,20}"
              aria-describedby={`${id}-thread-hint`}
              onChange={(event) => setThreadId(event.target.value)}
            />
          </Field>
          <Button
            variant="secondary"
            className="ui-button-sm justify-self-start"
            loading={pending}
            disabled={!!threadId && !/^[0-9]{17,20}$/.test(threadId)}
            onClick={() => void recover()}
          >
            스레드 복구
          </Button>
        </div>
      )}
    </div>
  );
}
