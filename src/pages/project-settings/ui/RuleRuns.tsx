"use client";

import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { StaleNotice } from "@/entities/service";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import { formatDate } from "@/shared/lib";
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  Select,
  Skeleton,
  type IconName,
} from "@/shared/ui";
import { ruleQueries } from "../api/rules";
import {
  eventLabels,
  resultMessage,
  ruleErrorMessage,
  runStatuses,
  runStatusLabels,
  type AutomationRule,
  type RuleRunStatus,
} from "../model/rule";

const statusIcons: Readonly<Record<RuleRunStatus, IconName>> = {
  PENDING: "clock",
  SENDING: "clock",
  SUCCEEDED: "check",
  SKIPPED: "minus",
  FAILED: "alert",
};

/** 상태 이름 + 아이콘. 색은 아이콘에만 두고 글자는 대비를 지킨다(색만으로 구분하지 않는다). */
export function RunStatus({ status }: { readonly status: RuleRunStatus }) {
  return (
    <span className="rule-run-status" data-status={status}>
      <Icon name={statusIcons[status]} width={14} height={14} />
      {runStatusLabels[status]}
    </span>
  );
}

const time: Intl.DateTimeFormatOptions = {
  year: undefined,
  hour: "2-digit",
  minute: "2-digit",
};

export function RuleRuns({
  projectId,
  rules,
  ruleId,
  onRuleChange,
}: {
  readonly projectId: string;
  readonly rules: readonly AutomationRule[];
  readonly ruleId: string;
  readonly onRuleChange: (ruleId: string) => void;
}) {
  const [status, setStatus] = useState<RuleRunStatus | "">("");
  // 지워진 규칙을 고른 채로 남지 않게 한다(서버는 404 RULE_NOT_FOUND).
  const selectedRule = rules.some((rule) => rule.id === ruleId) ? ruleId : "";
  const runs = useInfiniteQuery(
    ruleQueries.runs(projectId, { ruleId: selectedRule, status }),
  );
  const items = runs.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <section className="grid gap-4" aria-labelledby="rule-runs-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 id="rule-runs-heading" className="text-lg font-semibold">
          실행 기록
        </h3>
        <div className="rule-run-filters">
          <Select
            aria-label="규칙"
            value={selectedRule}
            onChange={(event) => onRuleChange(event.target.value)}
          >
            <option value="">모든 규칙</option>
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="결과"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as RuleRunStatus | "")
            }
          >
            <option value="">모든 결과</option>
            {runStatuses.map((value) => (
              <option key={value} value={value}>
                {runStatusLabels[value]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {runs.isPending ? (
        <div
          role="status"
          aria-label="실행 기록 불러오는 중"
          className="grid gap-2"
        >
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : runs.isError && !runs.data ? (
        <ErrorState
          title="실행 기록을 불러오지 못했습니다"
          description={ruleErrorMessage(normalizeApiError(runs.error))}
          onRetry={() => void runs.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={
            selectedRule || status
              ? "조건에 맞는 실행 기록이 없습니다"
              : "실행 기록이 없습니다"
          }
          description={
            selectedRule || status
              ? undefined
              : "규칙이 걸리면 여기에 결과와 이유가 남습니다."
          }
        />
      ) : (
        <>
          <StaleNotice query={runs} />
          <ul
            className="rule-runs"
            aria-label="실행 기록 목록"
            aria-busy={runs.isPlaceholderData || undefined}
          >
            {items.map((run) => (
              <li key={run.id} className="rule-run" data-status={run.status}>
                <time
                  dateTime={run.createdAt}
                  className="text-xs text-muted tabular-nums"
                >
                  {formatDate(run.createdAt, time)}
                </time>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{run.ruleName}</p>
                  <p className="truncate text-xs text-muted">
                    {eventLabels[run.event]}
                  </p>
                </div>
                <div className="min-w-0 text-sm">
                  {run.task ? (
                    <Link
                      href={routes.task(run.task.id)}
                      className="rule-run-task"
                    >
                      <span className="shrink-0 text-muted tabular-nums">
                        {run.task.key}
                      </span>
                      <span className="truncate">{run.task.title}</span>
                    </Link>
                  ) : run.incidentId ? (
                    <Link
                      href={routes.incident(run.incidentId)}
                      className="rule-run-task"
                      aria-label={`사고 보기: ${run.ruleName} ${formatDate(run.createdAt, time)}`}
                    >
                      <span className="truncate">사고 보기</span>
                    </Link>
                  ) : run.event === "INCIDENT_CREATED" ? (
                    <span className="text-muted">삭제된 사고</span>
                  ) : (
                    <span className="text-muted">삭제된 업무</span>
                  )}
                </div>
                <div className="min-w-0">
                  <RunStatus status={run.status} />
                  {run.attempts > 1 && (
                    <span className="ml-2 text-xs text-muted tabular-nums">
                      {run.attempts}회 시도
                    </span>
                  )}
                  {resultMessage(run.resultCode, run.status, run.event) && (
                    <p
                      className={`text-xs ${run.status === "FAILED" ? "text-danger" : "text-muted"}`}
                    >
                      {resultMessage(run.resultCode, run.status, run.event)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {runs.hasNextPage && (
            <Button
              variant="secondary"
              className="justify-self-start"
              loading={runs.isFetchingNextPage}
              onClick={() => void runs.fetchNextPage()}
            >
              더 보기
            </Button>
          )}
          {runs.isFetchNextPageError && (
            <p role="alert" className="text-sm text-danger">
              다음 기록을 불러오지 못했습니다. 다시 시도해 주세요.
            </p>
          )}
        </>
      )}
    </section>
  );
}
