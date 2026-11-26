"use client";

import { useEffect, useReducer, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeApiError } from "@/shared/api";
import { formatDate } from "@/shared/lib";
import {
  Badge,
  Button,
  CopyField,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  ListSkeleton,
  Select,
} from "@/shared/ui";
import {
  apiTokensQueryKey,
  createTokenForDialog,
  listApiTokens,
  revokeApiToken,
} from "../api/tokens";
import {
  claudeCodeSnippet,
  closedTokenDialog,
  codexSnippet,
  discardTokenOnHide,
  expiryOptions,
  mcpEndpoint,
  scopeLabels,
  tokenDialogReducer,
  type ApiToken,
  type ApiTokenScope,
  type CreatedApiToken,
} from "../model/api-token";

const endpoint = mcpEndpoint(process.env.NEXT_PUBLIC_API_URL ?? "");

function tokenErrorMessage(error: unknown) {
  const problem = normalizeApiError(error);
  if (problem.code === "TOKEN_LIMIT")
    return "활성 토큰은 10개까지 만들 수 있어요. 쓰지 않는 토큰을 폐기한 뒤 다시 만드세요.";
  return problem.message;
}

function CreatedToken({ token }: { readonly token: CreatedApiToken }) {
  return (
    <div className="grid gap-5">
      <p
        role="alert"
        className="rounded-xl bg-surface-box p-4 text-sm leading-6 font-semibold"
      >
        이 토큰은 지금 한 번만 보여 드려요. 창을 닫으면 다시 볼 수 없어요. 레포,
        이슈, PR, Discord에 붙여 넣지 마세요.
      </p>
      <CopyField id="api-token-value" label="토큰" value={token.token} />
      <CopyField
        id="api-token-claude"
        label="Claude Code"
        value={claudeCodeSnippet(endpoint, token.token)}
        multiline
      />
      <CopyField
        id="api-token-codex"
        label="Codex (~/.codex/config.toml)"
        value={codexSnippet(endpoint, token.token)}
        multiline
      />
      <p className="text-sm text-muted">
        만료일 {formatDate(token.expiresAt)}, 권한 {scopeLabels[token.scope]}
      </p>
    </div>
  );
}

function CreateTokenForm({
  onCreated,
  onCancel,
}: {
  readonly onCreated: (token: CreatedApiToken) => void;
  readonly onCancel: () => void;
}) {
  const client = useQueryClient();
  // 생성 요청은 useMutation 밖에서 부른다(평문 토큰이 mutation cache 에 실리지 않게).
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const scope = form.get("scope") === "WRITE" ? "WRITE" : "READ";
    const expiresInDays = Number(form.get("expiresInDays"));
    setPending(true);
    setError(null);
    createTokenForDialog(
      client,
      { name, scope: scope satisfies ApiTokenScope, expiresInDays },
      onCreated,
    ).then(
      () => setPending(false),
      (failure: unknown) => {
        setPending(false);
        setError(failure);
      },
    );
  }
  return (
    <form onSubmit={submit} className="grid gap-5">
      <Field id="api-token-name" label="이름" hint="예: 노트북 Claude Code">
        <Input
          id="api-token-name"
          name="name"
          required
          maxLength={50}
          pattern=".*\S.*"
          autoComplete="off"
          aria-describedby="api-token-name-hint"
          disabled={pending}
        />
      </Field>
      <Field
        id="api-token-scope"
        label="권한"
        hint="읽기는 조회만, 쓰기는 업무 생성과 상태 변경까지 할 수 있어요."
      >
        <Select
          id="api-token-scope"
          name="scope"
          defaultValue="READ"
          aria-describedby="api-token-scope-hint"
          disabled={pending}
        >
          <option value="READ">읽기</option>
          <option value="WRITE">쓰기</option>
        </Select>
      </Field>
      <Field id="api-token-expiry" label="만료">
        <Select
          id="api-token-expiry"
          name="expiresInDays"
          defaultValue="30"
          disabled={pending}
        >
          {expiryOptions.map((days) => (
            <option key={days} value={days}>
              {days}일
            </option>
          ))}
        </Select>
      </Field>
      {error !== null && (
        <p role="alert" className="text-sm text-danger">
          {tokenErrorMessage(error)}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" disabled={pending} onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" loading={pending}>
          토큰 만들기
        </Button>
      </div>
    </form>
  );
}

function TokenRow({
  token,
  onRevoke,
}: {
  readonly token: ApiToken;
  readonly onRevoke: () => void;
}) {
  return (
    <li className="list-row flex-wrap gap-y-2">
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold wrap-anywhere">{token.name}</span>
          <Badge className={token.scope === "WRITE" ? "badge-blue" : ""}>
            {scopeLabels[token.scope]}
          </Badge>
          {token.expired && <Badge className="badge-red">만료됨</Badge>}
        </div>
        <p className="text-xs text-muted">
          <span className="font-mono">{token.prefix}…</span>, 만든 날{" "}
          {formatDate(token.createdAt)}, 만료일 {formatDate(token.expiresAt)},
          마지막 사용 {token.lastUsedAt ? formatDate(token.lastUsedAt) : "없음"}
        </p>
      </div>
      <Button variant="ghost" className="ui-button-sm" onClick={onRevoke}>
        폐기
      </Button>
    </li>
  );
}

export function ApiTokens() {
  const client = useQueryClient();
  const tokens = useQuery({
    queryKey: apiTokensQueryKey,
    queryFn: listApiTokens,
  });
  const [dialog, dispatch] = useReducer(tokenDialogReducer, closedTokenDialog);
  // 페이지가 Activity 로 숨겨지거나 떠나면 평문 토큰을 버린다(돌아와도 다시 보이지 않게).
  useEffect(() => discardTokenOnHide(dispatch), []);
  const [revoking, setRevoking] = useState<ApiToken | null>(null);
  const revoke = useMutation({
    mutationFn: revokeApiToken,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: apiTokensQueryKey });
      setRevoking(null);
    },
  });
  const created = dialog.open ? dialog.created : null;
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        Claude Code, Codex 같은 도구가 MCP로 내 업무를 다룰 때 쓰는 토큰이에요.
        내 권한으로 동작하니 다른 사람과 공유하지 마세요. MCP 주소:{" "}
        <span className="font-mono break-all">{endpoint}</span>
      </p>
      <Button
        className="justify-self-start"
        onClick={() => dispatch({ type: "open" })}
      >
        토큰 만들기
      </Button>
      {/* 재조회가 실패하면 캐시(폐기된 토큰이 남아 있을 수 있음) 대신 오류를 보인다. QueryState를 쓰지 않는다. */}
      {tokens.isPending ? (
        <ListSkeleton
          label="API 토큰 불러오는 중"
          rows={2}
          rowClassName="h-16"
        />
      ) : tokens.isError ? (
        <ErrorState
          description={normalizeApiError(tokens.error).message}
          onRetry={() => void tokens.refetch()}
        />
      ) : tokens.data.length === 0 ? (
        <EmptyState title="만든 토큰이 없어요." />
      ) : (
        <ul className="list" aria-label="API 토큰 목록">
          {tokens.data.map((token) => (
            <TokenRow
              key={token.id}
              token={token}
              onRevoke={() => {
                revoke.reset();
                setRevoking(token);
              }}
            />
          ))}
        </ul>
      )}
      <Dialog
        open={dialog.open}
        onClose={() => dispatch({ type: "close" })}
        title={created ? "토큰을 만들었어요" : "API 토큰 만들기"}
      >
        {created ? (
          <div className="grid gap-5">
            <CreatedToken token={created} />
            <Button
              className="justify-self-end"
              onClick={() => dispatch({ type: "close" })}
            >
              복사했어요, 닫기
            </Button>
          </div>
        ) : (
          dialog.open && (
            <CreateTokenForm
              onCreated={(token) =>
                dispatch({
                  type: "created",
                  generation: dialog.generation,
                  token,
                })
              }
              onCancel={() => dispatch({ type: "close" })}
            />
          )
        )}
      </Dialog>
      <Dialog
        open={revoking !== null}
        onClose={() => {
          if (!revoke.isPending) setRevoking(null);
        }}
        title="토큰을 폐기할까요?"
      >
        <div className="grid gap-5">
          <p className="text-sm leading-6 text-muted">
            {revoking?.name} 토큰을 쓰는 도구는 바로 연결이 끊겨요. 되돌릴 수
            없어요.
          </p>
          {revoke.isError && (
            <p role="alert" className="text-sm text-danger">
              {normalizeApiError(revoke.error).message}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="secondary"
              disabled={revoke.isPending}
              onClick={() => setRevoking(null)}
            >
              취소
            </Button>
            <Button
              variant="danger"
              loading={revoke.isPending}
              onClick={() => {
                if (revoking && !revoke.isPending) revoke.mutate(revoking.id);
              }}
            >
              폐기
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
