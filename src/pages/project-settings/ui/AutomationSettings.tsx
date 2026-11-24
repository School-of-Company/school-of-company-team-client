"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { projectQueries, type ProjectDetail } from "@/entities/project";
import { normalizeApiError } from "@/shared/api";
import { relativeSince } from "@/shared/lib";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Icon,
  Skeleton,
  StaleNotice,
} from "@/shared/ui";
import { ruleQueries, useRuleChange } from "../api/rules";
import {
  actionText,
  brokenReferences,
  conditionValueLabel,
  fieldLabels,
  resultMessage,
  ruleErrorMessage,
  toggleRequest,
  triggerText,
  type AutomationRule,
  type RuleConditionField,
} from "../model/rule";
import { RuleEditor } from "./RuleEditor";
import { RuleRuns, RunStatus } from "./RuleRuns";

/**
 * 프로젝트 설정 > 자동화. 헤드 어드민·PM 만 이 탭을 본다(서버도 ADMIN 만 허용).
 * `editable=false`(아카이브)면 목록·기록만 보여 주고 바꾸는 조작은 막는다.
 */
export function AutomationSettings({
  project,
  activeUserIds,
  editable,
}: {
  readonly project: ProjectDetail;
  /** 리뷰어 후보 = 프로젝트 참여자 중 활성 사용자. */
  readonly activeUserIds: ReadonlySet<string>;
  readonly editable: boolean;
}) {
  const rules = useQuery(ruleQueries.rules(project.id));
  const buckets = useQuery(projectQueries.buckets(project.id));
  const change = useRuleChange(project.id);
  const [editing, setEditing] = useState<AutomationRule | null | undefined>();
  const [deleting, setDeleting] = useState<AutomationRule | null>(null);
  const [runRuleId, setRunRuleId] = useState("");
  const [toggling, setToggling] = useState<{
    readonly ruleId: string;
    readonly enabled: boolean;
  } | null>(null);
  const reviewers = project.members
    .filter((member) => activeUserIds.has(member.userId))
    .map((member) => ({ value: member.userId, label: member.name }));

  if (rules.isPending)
    return (
      <div role="status" aria-label="규칙 불러오는 중" className="grid gap-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    );
  if (rules.isError && !rules.data)
    return (
      <ErrorState
        title="규칙을 불러오지 못했습니다"
        description={ruleErrorMessage(normalizeApiError(rules.error))}
        onRetry={() => void rules.refetch()}
      />
    );
  const list = rules.data;
  const now = rules.dataUpdatedAt;
  const create = editable && (
    <Button onClick={() => setEditing(null)}>
      <Icon name="plus" className="inline-block" /> 규칙 추가
    </Button>
  );
  return (
    <div className="grid gap-8">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-xl text-sm text-muted">
            업무 이벤트나 장애가 생기면 조건에 맞을 때 동작 하나를 실행합니다.
            업무 상태는 바꾸지 않고, 개인, 팀 공용 업무에는 걸리지 않습니다.
          </p>
          {list.length > 0 && create}
        </div>
        <StaleNotice query={rules} />
        {list.length === 0 ? (
          <EmptyState
            title="규칙이 없습니다"
            description={
              editable
                ? "막힌 업무를 PM에게 알리거나, 리뷰 단계에 들어가면 리뷰어를 지정하는 규칙을 만들어 보세요."
                : undefined
            }
            action={create}
          />
        ) : (
          <ul className="rule-list" aria-label="자동화 규칙">
            {list.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                // 보내는 중인 값을 바로 보여 준다. 쿼리 상태 알림은 다음 틱이라, 그 사이 스위치가 되돌아 보이지 않게 한다.
                enabled={
                  toggling?.ruleId === rule.id ? toggling.enabled : rule.enabled
                }
                now={now}
                editable={editable}
                pending={change.isPending}
                onToggle={(enabled) => {
                  setToggling({ ruleId: rule.id, enabled });
                  change.mutate(
                    {
                      kind: "update",
                      ruleId: rule.id,
                      body: toggleRequest(rule, enabled),
                    },
                    { onSettled: () => setToggling(null) },
                  );
                }}
                onEdit={() => {
                  change.reset();
                  setEditing(rule);
                }}
                onDelete={() => setDeleting(rule)}
                onShowRuns={() => {
                  setRunRuleId(rule.id);
                  document
                    .getElementById("rule-runs-heading")
                    ?.scrollIntoView({ block: "start" });
                }}
              />
            ))}
          </ul>
        )}
        {change.isError && !deleting && (
          <p role="alert" className="text-sm text-danger">
            {ruleErrorMessage(normalizeApiError(change.error))} 이전 상태로
            되돌렸습니다.
          </p>
        )}
      </div>
      <RuleRuns
        projectId={project.id}
        rules={list}
        ruleId={runRuleId}
        onRuleChange={setRunRuleId}
      />
      <RuleEditor
        open={editing !== undefined}
        project={project}
        buckets={buckets.data ?? []}
        reviewers={reviewers}
        rule={editing ?? null}
        onClose={() => setEditing(undefined)}
      />
      <Dialog
        open={!!deleting}
        onClose={() => {
          if (!change.isPending) setDeleting(null);
        }}
        title="규칙을 삭제할까요?"
      >
        <p className="mb-6 text-sm text-muted">
          {deleting?.name} 규칙과 실행 기록이 함께 지워집니다. 잠시 멈추려면
          삭제 대신 끄세요.
        </p>
        {change.isError && deleting && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {ruleErrorMessage(normalizeApiError(change.error))}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            disabled={change.isPending}
            onClick={() => setDeleting(null)}
          >
            취소
          </Button>
          <Button
            variant="danger"
            loading={change.isPending}
            onClick={() => {
              if (!deleting || change.isPending) return;
              change.mutate(
                { kind: "delete", ruleId: deleting.id },
                { onSuccess: () => setDeleting(null) },
              );
            }}
          >
            삭제
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function RuleRow({
  rule,
  now,
  editable,
  enabled,
  pending,
  onToggle,
  onEdit,
  onDelete,
  onShowRuns,
}: {
  readonly rule: AutomationRule;
  readonly enabled: boolean;
  readonly now: number;
  readonly editable: boolean;
  readonly pending: boolean;
  readonly onToggle: (enabled: boolean) => void;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onShowRuns: () => void;
}) {
  const switchId = `rule-switch-${rule.id}`;
  const broken = brokenReferences(rule);
  const grouped = new Map<RuleConditionField, string[]>();
  for (const condition of rule.conditions)
    grouped.set(condition.field, [
      ...(grouped.get(condition.field) ?? []),
      conditionValueLabel(condition.field, condition.value, condition.label),
    ]);
  return (
    <li className="rule-row" data-enabled={enabled || undefined}>
      <input
        id={switchId}
        type="checkbox"
        role="switch"
        className="notify-switch"
        checked={enabled}
        aria-label={`${rule.name} 켜기`}
        disabled={!editable || pending}
        onChange={(event) => onToggle(event.currentTarget.checked)}
      />
      <div className="rule-main">
        <p className="rule-name">{rule.name}</p>
        <p className="text-sm text-foreground-2">
          {triggerText(rule)}, {actionText(rule)}
        </p>
        {grouped.size > 0 && (
          <ul className="rule-conditions" aria-label="조건">
            {[...grouped].map(([field, labels]) => (
              <li key={field}>
                <Badge>
                  {fieldLabels[field]} {labels.join(", ")}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {broken.length > 0 && (
          <p className="text-xs text-danger">
            제대로 실행되지 않습니다({broken.join(", ")}). 편집에서 고치세요.
          </p>
        )}
      </div>
      <div className="rule-last-run">
        {rule.lastRun ? (
          <button
            type="button"
            className="rule-last-run-link"
            onClick={onShowRuns}
          >
            <RunStatus status={rule.lastRun.status} />
            <span className="text-xs text-muted">
              {relativeSince(rule.lastRun.createdAt, now)}
            </span>
            {resultMessage(
              rule.lastRun.resultCode,
              rule.lastRun.status,
              rule.event,
            ) && (
              <span
                className={`block text-xs ${rule.lastRun.status === "FAILED" ? "text-danger" : "text-muted"}`}
              >
                {resultMessage(
                  rule.lastRun.resultCode,
                  rule.lastRun.status,
                  rule.event,
                )}
              </span>
            )}
          </button>
        ) : (
          <span className="text-xs text-muted">아직 실행되지 않음</span>
        )}
      </div>
      {editable && (
        <span className="rule-actions">
          <Button
            variant="ghost"
            className="ui-button-sm"
            disabled={pending}
            aria-label={`${rule.name} 편집`}
            onClick={onEdit}
          >
            편집
          </Button>
          <Button
            variant="ghost"
            className="ui-button-sm"
            disabled={pending}
            aria-label={`${rule.name} 삭제`}
            onClick={onDelete}
          >
            삭제
          </Button>
        </span>
      )}
    </li>
  );
}
