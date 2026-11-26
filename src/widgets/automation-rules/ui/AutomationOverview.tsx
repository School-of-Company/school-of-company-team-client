"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { projectQueries } from "@/entities/project";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import { formatDate, relativeSince } from "@/shared/lib";
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  InfoTip,
  Label,
  ListSkeleton,
  QueryState,
  Select,
} from "@/shared/ui";
import { ruleQueries, useReEnableRule } from "../api/rules";
import {
  overviewFilterFrom,
  overviewFilterQuery,
  successRate,
  type AutomationOverview as Overview,
  type AutomationOverviewRule,
  type OverviewFilter,
} from "../model/overview";
import {
  actionLabels,
  actions,
  disabledReasonText,
  eventLabel,
  resultMessage,
  ruleErrorMessage,
  selectableEvents,
} from "../model/rule";

const time: Intl.DateTimeFormatOptions = {
  year: undefined,
  hour: "2-digit",
  minute: "2-digit",
};

/** 관리자 설정 > 자동화 현황. 헤드 어드민만 본다(서버 LEAD 전용). 필터는 주소에 둔다. */
export function AutomationOverview() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filter = overviewFilterFrom(params ?? new URLSearchParams());
  const query = useQuery(ruleQueries.overview(filter));
  const projects = useQuery(projectQueries.list());
  const reEnable = useReEnableRule();
  const setFilter = (patch: Partial<OverviewFilter>) =>
    router.replace(
      `${pathname}?${overviewFilterQuery(
        { ...filter, ...patch },
        Object.fromEntries(params?.entries() ?? []),
      )}`,
      { scroll: false },
    );
  const now = query.dataUpdatedAt;

  return (
    <div className="grid gap-8">
      <div className="rule-run-filters" role="group" aria-label="규칙 필터">
        <Select
          aria-label="범위"
          value={filter.scope}
          onChange={(event) =>
            setFilter({ scope: event.target.value as OverviewFilter["scope"] })
          }
        >
          <option value="">모든 범위</option>
          <option value="PROJECT">프로젝트 규칙</option>
          <option value="TEAM">팀 규칙</option>
        </Select>
        <Select
          aria-label="프로젝트"
          value={filter.projectId}
          onChange={(event) => setFilter({ projectId: event.target.value })}
        >
          <option value="">모든 프로젝트</option>
          {(projects.data ?? []).map((project) => (
            <option key={project.id} value={project.id}>
              {project.key} {project.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="켜짐"
          value={filter.enabled}
          onChange={(event) =>
            setFilter({
              enabled: event.target.value as OverviewFilter["enabled"],
            })
          }
        >
          <option value="">켜짐과 꺼짐</option>
          <option value="true">켜진 규칙</option>
          <option value="false">꺼진 규칙</option>
        </Select>
        <Select
          aria-label="이벤트"
          value={filter.event}
          onChange={(event) =>
            setFilter({ event: event.target.value as OverviewFilter["event"] })
          }
        >
          <option value="">모든 이벤트</option>
          {selectableEvents.map((event) => (
            <option key={event} value={event}>
              {eventLabel(event)}
            </option>
          ))}
        </Select>
        <Select
          aria-label="동작"
          value={filter.action}
          onChange={(event) =>
            setFilter({
              action: event.target.value as OverviewFilter["action"],
            })
          }
        >
          <option value="">모든 동작</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {actionLabels[action]}
            </option>
          ))}
        </Select>
        <span className="flex items-center gap-2">
          <Checkbox
            id="overview-auto-disabled"
            checked={filter.autoDisabled}
            onChange={(event) =>
              setFilter({ autoDisabled: event.target.checked })
            }
          />
          <Label htmlFor="overview-auto-disabled">자동으로 꺼진 규칙만</Label>
        </span>
      </div>
      {reEnable.isError && (
        <p role="alert" className="text-sm text-danger">
          {ruleErrorMessage(normalizeApiError(reEnable.error))}
        </p>
      )}
      <QueryState
        query={query}
        isEmpty={(data: Overview) =>
          data.rules.length === 0 && data.recentFailures.length === 0
        }
        skeleton={
          <ListSkeleton
            label="자동화 현황 불러오는 중"
            rows={3}
            rowClassName="h-14"
          />
        }
        errorMessage={(error) => ruleErrorMessage(normalizeApiError(error))}
        empty={
          <EmptyState
            title="규칙이 없어요"
            description="필터를 바꾸거나 프로젝트 설정에서 규칙을 만드세요."
          />
        }
      >
        {(data) => (
          <>
            <section className="grid gap-3" aria-labelledby="overview-rules">
              <h3
                id="overview-rules"
                className="flex items-center gap-1 text-lg font-semibold"
              >
                규칙 <span className="tabular-nums">{data.rules.length}</span>
                <InfoTip label="자동화 현황 설명">
                  성공과 실패는 최근 7일 실행 수예요. 연속 5회 실패하거나
                  1시간에 100번 넘게 실행되면 규칙이 저절로 꺼져요.
                </InfoTip>
              </h3>
              <ul className="list" aria-label="자동화 규칙 현황">
                {data.rules.map((rule) => (
                  <OverviewRow
                    key={rule.id}
                    rule={rule}
                    now={now}
                    pending={
                      reEnable.isPending &&
                      reEnable.variables?.ruleId === rule.id
                    }
                    onReEnable={() =>
                      reEnable.mutate({
                        ruleId: rule.id,
                        target: rule.project
                          ? { scope: "PROJECT", projectId: rule.project.id }
                          : { scope: "TEAM" },
                      })
                    }
                  />
                ))}
              </ul>
            </section>
            <section className="grid gap-3" aria-labelledby="overview-failures">
              <h3 id="overview-failures" className="text-lg font-semibold">
                최근 실패
              </h3>
              {data.recentFailures.length === 0 ? (
                <p className="text-sm text-muted">최근 7일 실패가 없어요.</p>
              ) : (
                <ul className="rule-runs" aria-label="최근 실패 목록">
                  {data.recentFailures.map((failure) => (
                    <li
                      key={failure.runId}
                      className="rule-run"
                      data-status="FAILED"
                    >
                      <time
                        dateTime={failure.finishedAt ?? undefined}
                        className="text-xs text-muted tabular-nums"
                      >
                        {failure.finishedAt
                          ? formatDate(failure.finishedAt, time)
                          : ""}
                      </time>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {failure.ruleName}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {eventLabel(failure.event)}
                        </p>
                      </div>
                      <p className="min-w-0 text-xs text-danger">
                        {resultMessage(
                          failure.resultCode,
                          "FAILED",
                          failure.event,
                        )}
                      </p>
                      <p className="min-w-0 text-xs text-muted tabular-nums">
                        {failure.lastError}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </QueryState>
    </div>
  );
}

function OverviewRow({
  rule,
  now,
  pending,
  onReEnable,
}: {
  readonly rule: AutomationOverviewRule;
  readonly now: number;
  readonly pending: boolean;
  readonly onReEnable: () => void;
}) {
  const rate = successRate(rule);
  const href = rule.project
    ? routes.projectSettings(rule.project.id, "automation")
    : "/admin?tab=team-rules";
  return (
    <li className="rule-row" data-enabled={rule.enabled || undefined}>
      <span className="text-xs text-muted">
        {rule.enabled ? "켜짐" : "꺼짐"}
      </span>
      <div className="rule-main">
        <p className="rule-name">
          <Link href={href} className="hover:underline">
            {rule.name}
          </Link>{" "}
          <Badge>{rule.project ? rule.project.key : "팀"}</Badge>
        </p>
        <p className="text-sm text-foreground-2">
          {eventLabel(rule.event)}, {actionLabels[rule.action] ?? rule.action}
        </p>
        <p className="text-xs text-muted">
          {rule.owner ? `만든 사람 ${rule.owner.name}` : "만든 사람 없음"}
        </p>
        {rule.disabledReason && (
          <p className="text-xs text-danger">
            {disabledReasonText(rule.disabledReason)}
            {rule.disabledAt ? ` ${formatDate(rule.disabledAt, time)}` : ""}
          </p>
        )}
      </div>
      <div className="rule-last-run text-xs text-muted tabular-nums">
        <span className="block">
          성공 {rule.succeeded7d} 실패 {rule.failed7d} 건너뜀 {rule.skipped7d}
        </span>
        <span className="block">
          {rate === null ? "최근 7일 실행 없음" : `성공률 ${rate}%`}
        </span>
        <span className="block">
          {rule.lastRunAt
            ? `마지막 실행 ${relativeSince(rule.lastRunAt, now)}`
            : "아직 실행되지 않음"}
        </span>
      </div>
      {rule.disabledReason && !rule.enabled && (
        <span className="rule-actions">
          <Button
            variant="secondary"
            className="ui-button-sm"
            loading={pending}
            aria-label={`${rule.name} 다시 켜기`}
            onClick={onReEnable}
          >
            다시 켜기
          </Button>
        </span>
      )}
    </li>
  );
}
