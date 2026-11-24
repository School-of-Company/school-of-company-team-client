"use client";

import { useEffect, useReducer, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeApiError } from "@/shared/api";
import { formatDate } from "@/shared/lib";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  Field,
  Input,
  ListSkeleton,
  QueryState,
  Select,
  Textarea,
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
    return "활성 토큰은 10개까지 만들 수 있습니다. 쓰지 않는 토큰을 폐기한 뒤 다시 만드세요.";
  return problem.message;
}

function CopyField({
  id,
  label,
  value,
  multiline = false,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly multiline?: boolean;
}) {
  const [copied, setCopied] = useState<"ok" | "failed" | null>(null);
  const props = {
    id,
    readOnly: true,
    value,
    spellCheck: false,
    className: "min-w-0 flex-1 font-mono text-xs",
    onFocus: (event: { currentTarget: { select: () => void } }) =>
      event.currentTarget.select(),
  };
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex flex-wrap items-start gap-2">
        {multiline ? <Textarea rows={3} {...props} /> : <Input {...props} />}
        <Button
          variant="secondary"
          onClick={() =>
            void navigator.clipboard.writeText(value).then(
              () => setCopied("ok"),
              () => setCopied("failed"),
            )
          }
        >
          복사
        </Button>
      </div>
      {copied && (
        <p role="status" className="text-xs text-muted">
          {copied === "ok"
            ? "복사했습니다."
            : "복사하지 못했습니다. 입력란을 선택해 직접 복사하세요."}
        </p>
      )}
    </div>
  );
}

function CreatedToken({ token }: { readonly token: CreatedApiToken }) {
  return (
    <div className="grid gap-5">
      <p
        role="alert"
        className="rounded-xl bg-surface-box p-4 text-sm leading-6 font-semibold"
      >
        이 토큰은 지금 한 번만 보여 드립니다. 창을 닫으면 다시 볼 수 없습니다.
        레포, 이슈, PR, Discord에 붙여 넣지 마세요.
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
      <Field
        id="api-token-name"
        label="이름"
        hint="어디에 쓰는지 알아볼 수 있게 적으세요. 예: 노트북 Claude Code"
      >
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
        hint="읽기는 업무와 프로젝트 조회만, 쓰기는 업무 상태 변경과 생성도 할 수 있습니다."
      >
        <Select
          id="api-token-scope"
          name="scope"
          defaultValue="READ"
          aria-describedby="api-token-scope-hint"
          disabled={pending}
        >
          <option value="READ">읽기</option>
          <option value="WRITE">쓰기 (업무 상태 변경, 생성 가능)</option>
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
          <span className="font-semibold break-words">{token.name}</span>
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
        Claude Code와 Codex 같은 AI 도구가 MCP로 내 업무를 읽고 고칠 때 쓰는
        개인 토큰입니다. 토큰은 내 권한으로 동작하니 다른 사람과 공유하지
        마세요. MCP 주소는{" "}
        <span className="font-mono break-all">{endpoint}</span> 입니다.
      </p>
      <Button
        className="justify-self-start"
        onClick={() => dispatch({ type: "open" })}
      >
        토큰 만들기
      </Button>
      <QueryState
        query={tokens}
        skeleton={
          <ListSkeleton
            label="API 토큰 불러오는 중"
            rows={2}
            rowClassName="h-16"
          />
        }
        errorMessage={(error) => normalizeApiError(error).message}
        empty={<EmptyState title="만든 토큰이 없습니다" />}
      >
        {(data) => (
          <ul className="list" aria-label="API 토큰 목록">
            {data.map((token) => (
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
      </QueryState>
      <Dialog
        open={dialog.open}
        onClose={() => dispatch({ type: "close" })}
        title={created ? "토큰을 만들었습니다" : "API 토큰 만들기"}
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
            {revoking?.name} 토큰을 쓰는 도구는 바로 연결이 끊깁니다. 되돌릴 수
            없습니다.
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
