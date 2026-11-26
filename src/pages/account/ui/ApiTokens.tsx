"use client";

import { useEffect, useReducer, useState, type FormEvent } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  agentQueries,
  ProjectPicker,
  projectKeysLabel,
  type AgentPolicy,
} from "@/entities/agent";
import { projectQueries } from "@/entities/project";
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
  InfoTip,
  Input,
  ListSkeleton,
  SegmentedRadio,
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
  defaultExpiry,
  discardTokenOnHide,
  expiryOptions,
  MAX_TOKEN_PROJECTS,
  mcpEndpoint,
  scopeLabels,
  tokenDialogReducer,
  tokenRequest,
  type ApiToken,
  type ApiTokenScope,
  type CreatedApiToken,
} from "../model/api-token";

const endpoint = mcpEndpoint(process.env.NEXT_PUBLIC_API_URL ?? "");

type Limits = Pick<
  AgentPolicy,
  "mcpEnabled" | "allowWriteTokens" | "maxTokenDays"
>;

const detail = (details: unknown, key: string) =>
  typeof details === "object" && details !== null && key in details
    ? String((details as Record<string, unknown>)[key])
    : "";

function tokenErrorMessage(error: unknown) {
  const problem = normalizeApiError(error);
  const reason = detail(problem.details, "reason");
  if (problem.code === "TOKEN_LIMIT")
    return "만료되지 않은 토큰은 10개까지 둘 수 있어요. 쓰지 않는 토큰을 폐기한 뒤 다시 만들어 주세요.";
  if (
    problem.code === "AGENT_POLICY_DENIED" &&
    reason === "WRITE_TOKENS_DISABLED"
  )
    return "팀 정책으로 쓰기 토큰을 만들 수 없어요.";
  if (problem.code === "AGENT_POLICY_DENIED" && reason === "TOKEN_TOO_LONG")
    return `팀 정책상 최대 ${detail(problem.details, "maxTokenDays")}일까지 만들 수 있어요.`;
  if (problem.code === "PROJECT_NOT_FOUND")
    return `${detail(problem.details, "projectKey")} 프로젝트를 찾을 수 없어요. 목록을 새로 고쳐 주세요.`;
  return problem.message;
}

/** Claude Code, Codex 연결 방법. 토큰은 HUB_TOKEN 셸 변수로 넘긴다. */
function SetupSnippets() {
  return (
    <details className="task-github-disclosure">
      <summary>연결 방법</summary>
      <div className="grid gap-4 pt-3">
        <p className="text-sm text-muted">
          토큰을 HUB_TOKEN 셸 변수에 넣은 뒤 아래 설정을 붙여 넣어요.
        </p>
        <CopyField
          id="api-token-claude"
          label="Claude Code"
          value={claudeCodeSnippet(endpoint)}
          multiline
        />
        <CopyField
          id="api-token-codex"
          label="Codex"
          value={codexSnippet(endpoint)}
          multiline
        />
      </div>
    </details>
  );
}

function CreatedToken({ token }: { readonly token: CreatedApiToken }) {
  return (
    <div className="grid gap-5">
      <p
        role="alert"
        className="rounded-xl bg-surface-box p-4 text-sm leading-6 font-semibold"
      >
        이 토큰은 지금 한 번만 보여요. 창을 닫으면 다시 볼 수 없어요. 저장소,
        Issue, PR, Discord에 붙여 넣지 마세요.
      </p>
      <CopyField id="api-token-value" label="토큰" value={token.token} />
      <dl className="agent-limits">
        <div>
          <dt>권한</dt>
          <dd>{scopeLabels[token.scope]}</dd>
        </div>
        <div>
          <dt>프로젝트</dt>
          <dd>{projectKeysLabel(token.projectKeys)}</dd>
        </div>
        <div>
          <dt>만료일</dt>
          <dd>{formatDate(token.expiresAt)}</dd>
        </div>
      </dl>
      <SetupSnippets />
    </div>
  );
}

function CreateTokenForm({
  limits,
  onCreated,
  onCancel,
}: {
  readonly limits: Limits;
  readonly onCreated: (token: CreatedApiToken) => void;
  readonly onCancel: () => void;
}) {
  const client = useQueryClient();
  const projects = useQuery(projectQueries.list(true));
  // 생성 요청은 useMutation 밖에서 부른다(평문 토큰이 mutation cache 에 실리지 않게).
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<ApiTokenScope>("READ");
  const [restricted, setRestricted] = useState(false);
  const [keys, setKeys] = useState<readonly string[]>([]);
  const writeBlocked = limits.allowWriteTokens
    ? undefined
    : "팀 정책으로 쓰기 토큰을 만들 수 없어요.";
  const days = expiryOptions(limits.maxTokenDays);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const request = tokenRequest({
      name: String(form.get("name") ?? ""),
      scope: writeBlocked ? "READ" : scope,
      expiresInDays: Number(form.get("expiresInDays")),
      restricted,
      projectKeys: keys,
    });
    if ("error" in request) {
      setError(request.error);
      return;
    }
    setPending(true);
    setError(null);
    createTokenForDialog(client, request.body, onCreated).then(
      () => setPending(false),
      (failure: unknown) => {
        setPending(false);
        setError(tokenErrorMessage(failure));
      },
    );
  }
  return (
    <form onSubmit={submit} className="grid gap-5">
      <Field id="api-token-name" label="이름">
        <Input
          id="api-token-name"
          name="name"
          required
          maxLength={50}
          pattern=".*\S.*"
          autoComplete="off"
          placeholder="노트북 Claude Code"
          disabled={pending}
        />
      </Field>
      <div className="grid gap-2">
        <span className="flex items-center gap-1 text-sm font-medium">
          권한
          <InfoTip label="권한 설명">
            <span className="block">읽기는 조회 도구만 써요.</span>
            <span className="block">
              쓰기는 업무 상태 변경, 댓글, 스프린트처럼 팀 정책이 연 쓰기
              도구까지 써요.
            </span>
          </InfoTip>
        </span>
        <SegmentedRadio
          name="scope"
          label="권한"
          value={writeBlocked ? "READ" : scope}
          options={[
            { value: "READ", label: scopeLabels.READ },
            { value: "WRITE", label: scopeLabels.WRITE, blocked: writeBlocked },
          ]}
          onChange={setScope}
          disabled={pending}
          describedBy={writeBlocked ? "api-token-scope-blocked" : undefined}
        />
        {writeBlocked && (
          <p id="api-token-scope-blocked" className="text-xs text-muted">
            {writeBlocked}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <label htmlFor="api-token-expiry" className="text-sm font-medium">
          만료
        </label>
        <Select
          id="api-token-expiry"
          name="expiresInDays"
          defaultValue={defaultExpiry(limits.maxTokenDays)}
          aria-describedby="api-token-expiry-limit"
          disabled={pending}
        >
          {days.map((option) => (
            <option
              key={option.days}
              value={option.days}
              disabled={!option.allowed}
              title={
                option.allowed
                  ? undefined
                  : `팀 정책상 최대 ${limits.maxTokenDays}일이에요.`
              }
            >
              {option.days}일
            </option>
          ))}
        </Select>
        <p id="api-token-expiry-limit" className="text-xs text-muted">
          팀 정책상 최대 {limits.maxTokenDays}일이에요.
        </p>
      </div>
      <div className="grid gap-2">
        <span className="flex items-center gap-1 text-sm font-medium">
          프로젝트
          <InfoTip label="프로젝트 설명">
            <span className="block">
              프로젝트를 지정하면 그 프로젝트의 업무와 문서만 볼 수 있어요. 팀
              공용 업무, 개인 업무, 장애는 보이지 않아요.
            </span>
            <span className="block">만든 뒤에는 바꿀 수 없어요.</span>
          </InfoTip>
        </span>
        <SegmentedRadio
          name="project-scope"
          label="프로젝트 범위"
          value={restricted ? "SOME" : "ALL"}
          options={[
            { value: "ALL", label: "모든 프로젝트" },
            { value: "SOME", label: "프로젝트 지정" },
          ]}
          onChange={(value) => setRestricted(value === "SOME")}
          disabled={pending}
        />
        {restricted &&
          (projects.isPending ? (
            <ListSkeleton
              label="프로젝트 불러오는 중"
              rows={1}
              rowClassName="h-48"
            />
          ) : projects.isError ? (
            <ErrorState
              description={normalizeApiError(projects.error).message}
              onRetry={() => void projects.refetch()}
            />
          ) : (
            <ProjectPicker
              id="api-token-projects"
              label="토큰 프로젝트"
              options={projects.data.map((project) => ({
                value: project.key,
                label: `${project.key} ${project.name}`,
              }))}
              selected={keys}
              onChange={setKeys}
              max={MAX_TOKEN_PROJECTS}
              disabled={pending}
            />
          ))}
      </div>
      {error !== null && (
        <p role="alert" className="text-sm text-danger">
          {error}
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
          <Badge>{projectKeysLabel(token.projectKeys)}</Badge>
          {token.expired && <Badge className="badge-red">만료됨</Badge>}
        </div>
        <p className="text-xs text-muted">
          <span className="font-mono">{token.prefix}…</span>, 만든 날{" "}
          {formatDate(token.createdAt)}, 만료일 {formatDate(token.expiresAt)},
          마지막 사용 {token.lastUsedAt ? formatDate(token.lastUsedAt) : "없음"}
        </p>
      </div>
      <Button
        variant="ghost"
        className="ui-button-sm"
        aria-label={`${token.name} 폐기`}
        onClick={onRevoke}
      >
        폐기
      </Button>
    </li>
  );
}

/** 팀 정책 한도 한 줄. 정책을 읽는 동안에도 같은 높이를 잡는다. */
function PolicyLimits({
  policy,
}: {
  readonly policy: UseQueryResult<AgentPolicy>;
}) {
  if (policy.isPending)
    return <p className="ui-skeleton-text min-h-[1lh] text-sm">정책</p>;
  if (policy.isError)
    return (
      <p className="flex min-h-[1lh] flex-wrap items-center gap-2 text-sm text-muted">
        팀 정책을 불러오지 못해 토큰을 만들 수 없어요.
        <button
          type="button"
          className="ui-link-button"
          onClick={() => void policy.refetch()}
        >
          다시 시도
        </button>
      </p>
    );
  const data = policy.data;
  return (
    <dl className="agent-limits min-h-[1lh]">
      <div>
        <dt>최대 기간</dt>
        <dd>{data.maxTokenDays}일</dd>
      </div>
      <div>
        <dt>쓰기 토큰</dt>
        <dd>{data.allowWriteTokens ? "허용" : "허용 안 함"}</dd>
      </div>
      {!data.mcpEnabled && (
        <div>
          <dt>MCP</dt>
          <dd className="text-danger">헤드 어드민이 꺼 두었어요</dd>
        </div>
      )}
    </dl>
  );
}

export function ApiTokens() {
  const client = useQueryClient();
  const tokens = useQuery({
    queryKey: apiTokensQueryKey,
    queryFn: listApiTokens,
  });
  const policy = useQuery(agentQueries.policy());
  // 정책 한도를 알기 전에는 만들기를 열지 않는다(없는 한도로 고르게 하지 않는다).
  const limits: Limits | undefined = policy.data;
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
      <PolicyLimits policy={policy} />
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!limits} onClick={() => dispatch({ type: "open" })}>
          토큰 만들기
        </Button>
      </div>
      <SetupSnippets />
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
        <EmptyState
          title="만든 토큰이 없어요"
          description="토큰 만들기로 Claude Code나 Codex에 넣을 토큰을 만들어 보세요."
        />
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
          dialog.open &&
          limits && (
            <CreateTokenForm
              limits={limits}
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

/** 토큰 구역 제목 옆 설명. */
export function ApiTokensInfo() {
  return (
    <InfoTip label="API 토큰 설명">
      <span className="block">
        Claude Code, Codex 같은 에이전트가 MCP로 내 업무를 읽고 고칠 때 써요.
        토큰은 내 권한으로 동작하니 다른 사람과 공유하지 마세요.
      </span>
      <span className="block">
        MCP 주소 <span className="font-mono break-all">{endpoint}</span>
      </span>
    </InfoTip>
  );
}
