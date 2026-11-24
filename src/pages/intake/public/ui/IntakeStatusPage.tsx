"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  publicIntakeApi,
  RequesterPriorityLabel,
  requirementErrorMessage,
  RequirementStatusBadge,
  statusTokenFromHash,
  statusTokenFromInput,
  type PublicRequirement,
} from "@/entities/requirement";
import { normalizeApiError } from "@/shared/api";
import { formatDate } from "@/shared/lib";
import {
  Button,
  Dialog,
  ErrorState,
  Field,
  Input,
  Spinner,
  Textarea,
} from "@/shared/ui";

const statusKey = (token: string) => ["public-intake-status", token] as const;

/**
 * 요청자 상태 페이지(로그인 없음). 토큰은 URL fragment(`#토큰`) 또는 입력란에서 읽고
 * `X-Intake-Token` 헤더로만 보낸다. 경로·쿼리에 넣거나 콘솔에 남기지 않는다(D12-8).
 */
export function IntakeStatusPage() {
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const read = () => {
      setToken(statusTokenFromHash(window.location.hash));
      setChecked(true);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  if (!checked) return <Spinner label="상태 링크 확인 중" />;
  if (!token) return <TokenEntry onToken={setToken} />;
  return <StatusView token={token} onReset={() => setToken(null)} />;
}

function TokenEntry({
  onToken,
  problem,
}: {
  readonly onToken: (token: string) => void;
  readonly problem?: string;
}) {
  const id = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>(problem);
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const token = statusTokenFromInput(value);
    if (!token) {
      setError("상태 링크 전체 또는 # 뒤의 토큰을 붙여 넣으세요.");
      return;
    }
    // fragment 는 서버로 가지 않는다. 새로고침해도 다시 입력하지 않게 주소에 둔다.
    window.history.replaceState(null, "", `#${token}`);
    onToken(token);
  };
  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      <header className="grid gap-2">
        <h1 className="text-2xl font-bold">요구사항 진행 상황</h1>
        <p className="text-sm text-foreground-2">
          제출할 때 받은 상태 링크를 붙여 넣으세요.
        </p>
      </header>
      <Field id={`${id}-token`} label="상태 링크" error={error}>
        <Input
          id={`${id}-token`}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-token-error` : undefined}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </Field>
      <div>
        <Button type="submit">확인</Button>
      </div>
    </form>
  );
}

function StatusView({
  token,
  onReset,
}: {
  readonly token: string;
  readonly onReset: () => void;
}) {
  const status = useQuery({
    queryKey: statusKey(token),
    queryFn: () => publicIntakeApi.status(token),
    gcTime: 0,
    refetchInterval: 60_000,
  });
  if (status.isPending) return <Spinner label="진행 상황 불러오는 중" />;
  if (status.isError) {
    const problem = normalizeApiError(status.error);
    if (problem.status === 404)
      return (
        <TokenEntry
          onToken={(next) => {
            if (next === token) void status.refetch();
            else onReset();
          }}
          problem="이 링크로는 요구사항을 찾을 수 없습니다. 링크가 재발급되었다면 새 링크를 붙여 넣으세요."
        />
      );
    return (
      <ErrorState
        title="진행 상황을 불러오지 못했습니다"
        description={requirementErrorMessage(status.error)}
        onRetry={() => void status.refetch()}
      />
    );
  }
  return <StatusDetail token={token} data={status.data} />;
}

function StatusDetail({
  token,
  data,
}: {
  readonly token: string;
  readonly data: PublicRequirement;
}) {
  const id = useId();
  const client = useQueryClient();
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const send = useMutation({
    mutationFn: (body: string) => publicIntakeApi.reply(token, body),
    onSuccess: async () => {
      setReply("");
      setReplyError(null);
      await client.invalidateQueries({ queryKey: statusKey(token) });
    },
    onError: (error) => setReplyError(requirementErrorMessage(error)),
  });
  const withdraw = useMutation({
    mutationFn: () => publicIntakeApi.withdraw(token),
    onSuccess: (next) => {
      client.setQueryData(statusKey(token), next);
      setConfirmWithdraw(false);
    },
  });
  return (
    <div className="grid gap-8">
      <header className="grid gap-3">
        {data.formTitle && (
          <p className="text-sm text-muted">{data.formTitle}</p>
        )}
        <h1 className="text-2xl font-bold break-words">{data.title}</h1>
        <p className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <RequirementStatusBadge
            status={data.status}
            label={data.statusLabel}
          />
          <span>접수 {formatDate(data.submittedAt)}</span>
          <RequesterPriorityLabel priority={data.priority} />
          {data.desiredDate && (
            <span>희망 일정 {formatDate(data.desiredDate)}</span>
          )}
          {data.progress.total > 0 && (
            <span>
              진행 업무 {data.progress.done}/{data.progress.total} 완료
            </span>
          )}
        </p>
        {data.statusReason && (
          <p className="rounded-xl bg-surface-box p-4 text-sm whitespace-pre-wrap">
            <span className="font-semibold">사유 </span>
            {data.statusReason}
          </p>
        )}
      </header>

      <section className="grid gap-4" aria-labelledby={`${id}-sections`}>
        <h2 id={`${id}-sections`} className="text-lg font-semibold">
          제출한 내용
        </h2>
        <dl className="grid gap-4">
          {data.sections.map((section) => (
            <div key={section.key} className="grid gap-1">
              <dt className="text-sm font-medium text-muted">
                {section.label}
              </dt>
              <dd className="text-sm break-words whitespace-pre-wrap">
                {section.body}
              </dd>
            </div>
          ))}
          {data.references.length > 0 && (
            <div className="grid gap-1">
              <dt className="text-sm font-medium text-muted">참고 자료</dt>
              <dd>
                <ul className="grid gap-1 text-sm">
                  {data.references.map((reference) => (
                    <li key={reference.url} className="break-all">
                      <a
                        href={reference.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {reference.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="grid gap-4" aria-labelledby={`${id}-thread`}>
        <h2 id={`${id}-thread`} className="text-lg font-semibold">
          답변
        </h2>
        {data.messages.length === 0 ? (
          <p className="text-sm text-muted">아직 답변이 없습니다.</p>
        ) : (
          <ol className="grid gap-3">
            {data.messages.map((message, index) => (
              <li
                key={`${message.createdAt}-${index}`}
                className={`grid gap-1 rounded-xl p-4 ${message.author === "TEAM" ? "bg-surface-box" : "bg-brand-soft"}`}
              >
                <p className="text-xs text-muted">
                  {message.author === "TEAM" ? "팀" : "나"} ·{" "}
                  {formatDate(message.createdAt, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-sm break-words whitespace-pre-wrap">
                  {message.body}
                </p>
              </li>
            ))}
          </ol>
        )}
        {data.canReply ? (
          <form
            noValidate
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const body = reply.trim();
              if (!body || body.length > 5000) {
                setReplyError("답글은 1~5000자로 적어 주세요.");
                return;
              }
              if (!send.isPending) send.mutate(body);
            }}
          >
            <Field
              id={`${id}-reply`}
              label="답글"
              error={replyError ?? undefined}
            >
              <Textarea
                id={`${id}-reply`}
                maxLength={5000}
                value={reply}
                aria-invalid={!!replyError || undefined}
                aria-describedby={replyError ? `${id}-reply-error` : undefined}
                onChange={(event) => setReply(event.target.value)}
              />
            </Field>
            <div>
              <Button type="submit" loading={send.isPending}>
                답글 보내기
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted">
            철회했거나 닫힌 요구사항에는 답글을 달 수 없습니다.
          </p>
        )}
      </section>

      {data.canWithdraw && (
        <section className="grid gap-3 border-t border-border pt-6">
          <p className="text-sm text-muted">
            검토 전이라면 요구사항을 철회할 수 있습니다. 철회하면 되돌릴 수
            없습니다.
          </p>
          <div>
            <Button variant="danger" onClick={() => setConfirmWithdraw(true)}>
              요구사항 철회
            </Button>
          </div>
        </section>
      )}
      <Dialog
        open={confirmWithdraw}
        onClose={() => {
          if (!withdraw.isPending) setConfirmWithdraw(false);
        }}
        title="요구사항을 철회할까요?"
      >
        <p className="mb-4 text-sm text-muted">
          철회하면 팀이 더 이상 검토하지 않고 답글도 달 수 없습니다. 되돌릴 수
          없습니다.
        </p>
        {withdraw.isError && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {requirementErrorMessage(withdraw.error)}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            disabled={withdraw.isPending}
            onClick={() => setConfirmWithdraw(false)}
          >
            취소
          </Button>
          <Button
            variant="danger"
            loading={withdraw.isPending}
            onClick={() => withdraw.mutate()}
          >
            철회
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
