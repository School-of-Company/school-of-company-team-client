"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  accessLabels,
  agentAccessLevels,
  AgentActivityTable,
  agentApi,
  agentAreas,
  agentKeys,
  agentQueries,
  agentWriteTools,
  areaLabels,
  exceedsMax,
  hasPolicyErrors,
  MAX_TOKEN_DAYS,
  policyDraft,
  policyRequest,
  ProjectPicker,
  projectKeysLabel,
  validatePolicy,
  type ActivityFilters,
  type AdminApiToken,
  type AgentAccess,
  type AgentPolicy,
  type PolicyDraft,
  type PolicyErrors,
} from "@/entities/agent";
import { projectQueries } from "@/entities/project";
import { activeUsersQueryOptions } from "@/entities/user";
import { normalizeApiError } from "@/shared/api";
import { formatDate } from "@/shared/lib";
import {
  Badge,
  Button,
  Checkbox,
  DatePicker,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  InfoTip,
  Input,
  ListSkeleton,
  QueryState,
  SegmentedRadio,
  Select,
  useToast,
} from "@/shared/ui";

export function AgentAdmin() {
  return (
    <div className="grid gap-10">
      <section
        className="settings-card grid gap-5"
        aria-labelledby="agent-policy-heading"
      >
        <h2
          id="agent-policy-heading"
          className="flex items-center gap-1 text-xl font-semibold"
        >
          에이전트 정책
          <InfoTip label="에이전트 정책 설명">
            <span className="block">
              팀 전체에 하나인 정책이에요. 에이전트가 쓸 수 있는 범위는 토큰
              주인의 권한, 토큰 권한, 이 정책이 모두 허락하는 만큼이에요.
            </span>
            <span className="block">저장하면 다음 요청부터 바로 적용돼요.</span>
          </InfoTip>
        </h2>
        <PolicySection />
      </section>
      <section
        className="settings-card grid gap-5"
        aria-labelledby="agent-tokens-heading"
      >
        <h2 id="agent-tokens-heading" className="text-xl font-semibold">
          전체 토큰
        </h2>
        <AllTokens />
      </section>
      <section
        className="settings-card grid gap-5"
        aria-labelledby="agent-activity-heading"
      >
        <h2
          id="agent-activity-heading"
          className="flex items-center gap-1 text-xl font-semibold"
        >
          에이전트 활동
          <InfoTip label="에이전트 활동 설명">
            <span className="block">
              MCP 쓰기 도구 호출을 성공과 실패 모두 남겨요. 읽기 도구는 남기지
              않아요. 90일이 지나면 지워져요.
            </span>
          </InfoTip>
        </h2>
        <Activity />
      </section>
    </div>
  );
}

function PolicySection() {
  const policy = useQuery(agentQueries.policy());
  if (policy.isPending)
    return (
      <ListSkeleton
        label="에이전트 정책 불러오는 중"
        rows={6}
        rowClassName="h-10"
      />
    );
  if (policy.isError)
    return (
      <ErrorState
        description={normalizeApiError(policy.error).message}
        onRetry={() => void policy.refetch()}
      />
    );
  // 저장한 응답으로 폼을 새로 연다(서버가 정리한 값으로 맞춘다).
  return (
    <PolicyForm key={policy.data.updatedAt ?? "default"} policy={policy.data} />
  );
}

function PolicyForm({ policy }: { readonly policy: AgentPolicy }) {
  const client = useQueryClient();
  const toast = useToast();
  const projects = useQuery(projectQueries.list(true));
  const [draft, setDraft] = useState<PolicyDraft>(() => policyDraft(policy));
  const [errors, setErrors] = useState<PolicyErrors>({});
  const save = useMutation({
    mutationFn: agentApi.updatePolicy,
    onSuccess: (saved) => {
      client.setQueryData(agentKeys.policy, saved);
      toast("에이전트 정책을 저장했어요.", "success");
    },
  });
  const set = (patch: Partial<PolicyDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.isPending) return;
    const found = validatePolicy(draft, policy.maxAccess);
    setErrors(found);
    if (!hasPolicyErrors(found)) save.mutate(policyRequest(draft, policy));
  }
  return (
    <form className="grid gap-6" onSubmit={submit} noValidate>
      <div className="grid gap-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox
            checked={draft.mcpEnabled}
            onChange={(event) => set({ mcpEnabled: event.target.checked })}
          />
          MCP 사용
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox
            checked={draft.allowWriteTokens}
            onChange={(event) =>
              set({ allowWriteTokens: event.target.checked })
            }
          />
          쓰기 토큰 허용
        </label>
        {!draft.allowWriteTokens && (
          <p className="text-xs text-muted">
            이미 있는 쓰기 토큰도 읽기로만 동작해요.
          </p>
        )}
      </div>
      <Field
        id="agent-max-days"
        label="토큰 최대 기간"
        error={errors.maxTokenDays}
      >
        <div className="flex items-center gap-2">
          <Input
            id="agent-max-days"
            inputMode="numeric"
            className="max-w-24"
            value={draft.maxTokenDays}
            aria-invalid={!!errors.maxTokenDays || undefined}
            aria-describedby={
              errors.maxTokenDays ? "agent-max-days-error" : undefined
            }
            onChange={(event) => set({ maxTokenDays: event.target.value })}
          />
          <span className="text-sm text-muted">
            일, 최대 {MAX_TOKEN_DAYS}일
          </span>
        </div>
      </Field>
      <div className="grid gap-2">
        <span className="flex items-center gap-1 text-sm font-medium">
          허용 프로젝트
          <InfoTip label="허용 프로젝트 설명">
            <span className="block">
              프로젝트를 지정하면 에이전트는 그 프로젝트만 봐요. 팀 공용 업무,
              개인 업무, 장애와 운영 도구는 쓸 수 없어요.
            </span>
            <span className="block">
              하나도 고르지 않으면 어떤 프로젝트도 볼 수 없어요.
            </span>
          </InfoTip>
        </span>
        <SegmentedRadio
          name="agent-projects"
          label="허용 프로젝트 범위"
          value={draft.allProjects ? "ALL" : "SOME"}
          options={[
            { value: "ALL", label: "모든 프로젝트" },
            { value: "SOME", label: "프로젝트 지정" },
          ]}
          onChange={(value) => set({ allProjects: value === "ALL" })}
          disabled={save.isPending}
        />
        {!draft.allProjects &&
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
              id="agent-policy-projects"
              label="허용 프로젝트"
              options={projects.data.map((project) => ({
                value: project.id,
                label: `${project.key} ${project.name}`,
              }))}
              selected={draft.projectIds}
              onChange={(projectIds) => set({ projectIds })}
              max={100}
            />
          ))}
        {errors.projects && (
          <p role="alert" className="text-sm text-danger">
            {errors.projects}
          </p>
        )}
      </div>
      <fieldset className="grid gap-3">
        <legend className="mb-2 flex items-center gap-1 text-sm font-medium">
          영역
          <InfoTip label="영역 설명">
            <span className="block">
              끔이면 그 영역 도구가 에이전트 목록에서 사라지고, 읽기면 쓰기
              도구만 사라져요.
            </span>
            <span className="block">
              화이트보드와 통계는 쓰기 도구가 없어 읽기까지만 열 수 있어요.
            </span>
          </InfoTip>
        </legend>
        {agentAreas.map((area) => (
          <div key={area} className="grid gap-1">
            <div className="agent-area-row">
              <label htmlFor={`agent-area-${area}`} className="text-sm">
                {areaLabels[area]}
              </label>
              <Select
                id={`agent-area-${area}`}
                value={draft.areas[area]}
                aria-invalid={!!errors.areas?.[area] || undefined}
                aria-describedby={
                  errors.areas?.[area] ? `agent-area-${area}-error` : undefined
                }
                onChange={(event) => {
                  const access = agentAccessLevels.find(
                    (level) => level === event.target.value,
                  );
                  if (access)
                    set({ areas: { ...draft.areas, [area]: access } });
                }}
              >
                {agentAccessLevels.map((level: AgentAccess) => (
                  <option
                    key={level}
                    value={level}
                    disabled={exceedsMax(level, policy.maxAccess[area])}
                  >
                    {accessLabels[level]}
                  </option>
                ))}
              </Select>
            </div>
            {errors.areas?.[area] && (
              <p
                id={`agent-area-${area}-error`}
                role="alert"
                className="text-sm text-danger"
              >
                {errors.areas[area]}
              </p>
            )}
          </div>
        ))}
      </fieldset>
      {save.isError && (
        <p role="alert" className="text-sm text-danger">
          {normalizeApiError(save.error).message}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {policy.updatedAt
            ? `${policy.updatedBy?.name ?? "알 수 없음"}님이 ${formatDate(policy.updatedAt)}에 바꿨어요.`
            : "기본값을 쓰고 있어요."}
        </p>
        <Button type="submit" loading={save.isPending}>
          정책 저장
        </Button>
      </div>
    </form>
  );
}

function AllTokens() {
  const client = useQueryClient();
  const tokens = useQuery(agentQueries.adminTokens());
  const [revoking, setRevoking] = useState<AdminApiToken | null>(null);
  const revoke = useMutation({
    mutationFn: agentApi.revokeAnyToken,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: agentKeys.adminTokens });
      setRevoking(null);
    },
  });
  return (
    <>
      {/* 폐기된 토큰이 캐시에 남아 보이지 않게, 재조회 실패도 오류로 보인다. */}
      {tokens.isPending ? (
        <ListSkeleton label="전체 토큰 불러오는 중" rows={3} />
      ) : tokens.isError ? (
        <ErrorState
          description={normalizeApiError(tokens.error).message}
          onRetry={() => void tokens.refetch()}
        />
      ) : tokens.data.length === 0 ? (
        <EmptyState
          title="만든 토큰이 없어요"
          description="팀원이 설정의 API 토큰에서 토큰을 만들면 여기에 보여요."
        />
      ) : (
        <div className="agent-table-wrap">
          <table className="agent-table">
            <caption className="sr-only">팀원의 API 토큰</caption>
            <thead>
              <tr>
                <th scope="col">이름</th>
                <th scope="col">사용자</th>
                <th scope="col">권한</th>
                <th scope="col">프로젝트</th>
                <th scope="col">만료일</th>
                <th scope="col">마지막 사용</th>
                <th scope="col">
                  <span className="sr-only">동작</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tokens.data.map((token) => (
                <tr key={token.id}>
                  <th scope="row" className="font-medium">
                    <span className="break-words">{token.name}</span>
                    <span className="block font-mono text-xs font-normal text-muted">
                      {token.prefix}…
                    </span>
                  </th>
                  <td>{token.owner?.name ?? "알 수 없음"}</td>
                  <td>
                    <Badge
                      className={token.scope === "WRITE" ? "badge-blue" : ""}
                    >
                      {token.scope === "WRITE" ? "쓰기" : "읽기"}
                    </Badge>
                  </td>
                  <td className="break-words">
                    {projectKeysLabel(token.projectKeys)}
                  </td>
                  <td className="whitespace-nowrap">
                    {token.expired ? (
                      <Badge className="badge-red">만료됨</Badge>
                    ) : (
                      formatDate(token.expiresAt)
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {token.lastUsedAt ? formatDate(token.lastUsedAt) : "없음"}
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      className="ui-button-sm"
                      aria-label={`${token.owner?.name ?? ""} ${token.name} 폐기`}
                      onClick={() => {
                        revoke.reset();
                        setRevoking(token);
                      }}
                    >
                      폐기
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog
        open={revoking !== null}
        onClose={() => {
          if (!revoke.isPending) setRevoking(null);
        }}
        title="토큰을 폐기할까요?"
      >
        <div className="grid gap-5">
          <p className="text-sm leading-6 text-muted">
            {revoking?.owner?.name}님의 {revoking?.name} 토큰을 쓰는 도구는 바로
            연결이 끊겨요. 되돌릴 수 없어요.
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
    </>
  );
}

const filterParams = {
  userId: "agentUser",
  tool: "agentTool",
  from: "agentFrom",
  to: "agentTo",
} as const;

/** 필터는 URL 에 둔다(새로 고쳐도, 링크를 나눠도 같은 기록). */
function Activity() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const filters: ActivityFilters = {
    userId: search?.get(filterParams.userId) ?? undefined,
    tool: search?.get(filterParams.tool) ?? undefined,
    from: search?.get(filterParams.from) ?? undefined,
    to: search?.get(filterParams.to) ?? undefined,
  };
  const [tool, setTool] = useState(filters.tool ?? "");
  const users = useQuery(activeUsersQueryOptions());
  const activity = useQuery(agentQueries.activity("admin", filters));
  function change(key: keyof typeof filterParams, value: string) {
    const next = new URLSearchParams(search?.toString());
    if (value) next.set(filterParams[key], value);
    else next.delete(filterParams[key]);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }
  const filtered = Object.values(filters).some(Boolean);
  const rangeInvalid =
    !!filters.from && !!filters.to && filters.from > filters.to;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-2">
          <label htmlFor="agent-filter-user" className="text-sm font-medium">
            사용자
          </label>
          <Select
            id="agent-filter-user"
            value={filters.userId ?? ""}
            onChange={(event) => change("userId", event.target.value)}
          >
            <option value="">모든 사용자</option>
            {(users.data ?? []).map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </div>
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            change("tool", tool.trim());
          }}
        >
          <label htmlFor="agent-filter-tool" className="text-sm font-medium">
            도구
          </label>
          <Input
            id="agent-filter-tool"
            list="agent-tool-names"
            className="font-mono"
            value={tool}
            placeholder="update_task_status"
            autoComplete="off"
            onChange={(event) => setTool(event.target.value)}
            onBlur={() => {
              if (tool.trim() !== (filters.tool ?? ""))
                change("tool", tool.trim());
            }}
          />
          <datalist id="agent-tool-names">
            {agentWriteTools.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </form>
        <Field id="agent-filter-from" label="시작일">
          <DatePicker
            id="agent-filter-from"
            label="시작일"
            value={filters.from ?? ""}
            max={filters.to}
            onChange={(value) => change("from", value)}
          />
        </Field>
        <Field id="agent-filter-to" label="종료일">
          <DatePicker
            id="agent-filter-to"
            label="종료일"
            value={filters.to ?? ""}
            min={filters.from}
            onChange={(value) => change("to", value)}
          />
        </Field>
        {filtered && (
          <Button
            variant="ghost"
            onClick={() => {
              setTool("");
              const next = new URLSearchParams(search?.toString());
              for (const key of Object.values(filterParams)) next.delete(key);
              router.replace(`${pathname}?${next.toString()}`, {
                scroll: false,
              });
            }}
          >
            필터 지우기
          </Button>
        )}
      </div>
      {rangeInvalid ? (
        <EmptyState
          title="기간을 다시 골라 주세요"
          description="시작일이 종료일보다 늦어요."
        />
      ) : (
        <QueryState
          query={activity}
          skeleton={<ListSkeleton label="에이전트 활동 불러오는 중" rows={4} />}
          errorMessage={(error) => normalizeApiError(error).message}
          empty={
            filtered ? (
              <EmptyState
                title="조건에 맞는 기록이 없어요"
                description="필터를 바꾸거나 지워 보세요."
              />
            ) : (
              <EmptyState
                title="에이전트 활동이 없어요"
                description="팀원이 쓰기 토큰으로 에이전트를 쓰면 여기에 남아요."
              />
            )
          }
        >
          {(items) => (
            <AgentActivityTable
              items={items}
              showUser
              caption="전체 에이전트 활동"
            />
          )}
        </QueryState>
      )}
    </div>
  );
}
