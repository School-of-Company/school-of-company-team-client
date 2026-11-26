"use client";

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { projectQueries, type ProjectDetail } from "@/entities/project";
import { sprintQueries } from "@/entities/sprint";
import { activeUsersQueryOptions } from "@/entities/user";
import { normalizeApiError } from "@/shared/api";
import { relativeSince } from "@/shared/lib";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Icon,
  InfoTip,
  ListSkeleton,
  StaleNotice,
} from "@/shared/ui";
import { ruleQueries, useRuleChange } from "../api/rules";
import {
  actionText,
  brokenReferences,
  conditionValueLabel,
  disabledReasonText,
  fieldLabels,
  resultMessage,
  ruleErrorMessage,
  toggleRequest,
  triggerText,
  type AutomationRule,
  type RuleConditionField,
  type RuleForm,
} from "../model/rule";
import { RuleEditor, type RuleEditorContext } from "./RuleEditor";
import { RuleTemplatePicker } from "./RuleTemplatePicker";
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
  const buckets = useQuery(projectQueries.buckets(project.id));
  const sprints = useQuery(sprintQueries.list(project.id));
  const context: RuleEditorContext = {
    target: { scope: "PROJECT", projectId: project.id },
    parts: project.parts.map((part) => ({ value: part.id, label: part.name })),
    buckets: buckets.data ?? [],
    sprints: (sprints.data ?? [])
      .filter((sprint) => sprint.status !== "CLOSED")
      .map((sprint) => ({ value: sprint.id, label: sprint.name })),
    people: project.members
      .filter((member) => activeUserIds.has(member.userId))
      .map((member) => ({ value: member.userId, label: member.name })),
    projects: [],
    archivedProjects: [],
  };
  return (
    <AutomationRules
      context={context}
      editable={editable}
      intro={
        <p className="max-w-xl text-sm text-muted">
          업무, 장애, 배포, 스프린트 같은 일이 생기거나 정한 시각이 되면 조건에
          맞을 때 동작 하나를 실행해요. 개인, 팀 공용 업무에는 걸리지 않아요.
        </p>
      }
    />
  );
}

/** 관리자 설정 > 팀 규칙. 헤드 어드민만 본다(서버 LEAD 전용). 아카이브가 아닌 모든 프로젝트, 또는 고른 프로젝트에 걸린다. */
export function TeamRules() {
  const projects = useQuery(projectQueries.list(true));
  const users = useQuery(activeUsersQueryOptions());
  const context: RuleEditorContext = {
    target: { scope: "TEAM" },
    parts: [],
    buckets: [],
    sprints: [],
    people: (users.data ?? []).map((user) => ({
      value: user.id,
      label: user.name,
    })),
    projects: projectOptions(projects.data ?? [], false),
    archivedProjects: projectOptions(projects.data ?? [], true),
  };
  return (
    <AutomationRules
      context={context}
      editable
      intro={
        <div className="flex max-w-xl items-center gap-1 text-sm text-muted">
          모든 프로젝트에 같은 규칙을 걸어요.
          <InfoTip label="팀 규칙 설명">
            프로젝트 규칙과 함께 걸릴 수 있어요. 겹치면 프로젝트 규칙을 끄세요.
            파트, 버킷, 스프린트, 리뷰어, 담당자처럼 프로젝트마다 다른 대상은
            고를 수 없어요.
          </InfoTip>
        </div>
      }
    />
  );
}

/** 규칙 목록 + 실행 기록 + 편집기. 프로젝트 규칙과 팀 규칙이 같이 쓴다. */
function AutomationRules({
  context,
  editable,
  intro,
}: {
  readonly context: RuleEditorContext;
  readonly editable: boolean;
  readonly intro: ReactNode;
}) {
  const target = context.target;
  const rules = useQuery(ruleQueries.rules(target));
  const change = useRuleChange(target);
  // rule = null 은 새 규칙, initial 은 템플릿으로 채운 값.
  const [editing, setEditing] = useState<
    | { readonly rule: AutomationRule | null; readonly initial?: RuleForm }
    | undefined
  >();
  const [picking, setPicking] = useState(false);
  const [deleting, setDeleting] = useState<AutomationRule | null>(null);
  const [runRuleId, setRunRuleId] = useState("");
  const [toggling, setToggling] = useState<{
    readonly ruleId: string;
    readonly enabled: boolean;
  } | null>(null);

  // 안내 문단은 바로 그리고 목록 자리만 빈 상태 높이로 잡는다.
  if (rules.isPending)
    return (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {intro}
        </div>
        <ListSkeleton label="규칙 불러오는 중" rows={2} rowClassName="h-14" />
      </div>
    );
  if (rules.isError && !rules.data)
    return (
      <ErrorState
        title="규칙을 불러오지 못했어요"
        description={ruleErrorMessage(normalizeApiError(rules.error))}
        onRetry={() => void rules.refetch()}
      />
    );
  const list = rules.data;
  const now = rules.dataUpdatedAt;
  const create = editable && (
    <Button onClick={() => setEditing({ rule: null })}>
      <Icon name="plus" className="inline-block" /> 규칙 추가
    </Button>
  );
  const fromTemplate = editable && (
    <Button variant="secondary" onClick={() => setPicking(true)}>
      템플릿에서 만들기
    </Button>
  );
  return (
    <div className="grid gap-8">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {intro}
          <span className="flex flex-wrap gap-2">
            {fromTemplate}
            {list.length > 0 && create}
          </span>
        </div>
        <StaleNotice query={rules} />
        {list.length === 0 ? (
          <EmptyState
            title="규칙이 없어요"
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
                  setEditing({ rule });
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
            되돌렸어요.
          </p>
        )}
      </div>
      <RuleRuns
        target={target}
        projects={context.projects}
        archivedProjects={context.archivedProjects}
        rules={list}
        ruleId={runRuleId}
        onRuleChange={setRunRuleId}
      />
      <RuleTemplatePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(initial) => {
          setPicking(false);
          change.reset();
          setEditing({ rule: null, initial });
        }}
      />
      <RuleEditor
        open={editing !== undefined}
        context={context}
        rule={editing?.rule ?? null}
        initial={editing?.initial}
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
          {deleting?.name} 규칙과 실행 기록이 함께 지워져요. 잠시 멈추려면 삭제
          대신 끄세요.
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
        {rule.disabledReason && !enabled && (
          <p className="text-xs text-danger">
            {disabledReasonText(rule.disabledReason)} 원인을 고친 뒤 다시
            켜세요.
          </p>
        )}
        {rule.scope === "TEAM" && (
          <p className="text-xs text-muted">
            {rule.projects?.length
              ? rule.projects.map((project) => project.key).join(", ")
              : "모든 프로젝트"}
          </p>
        )}
        {broken.length > 0 && (
          <p className="text-xs text-danger">
            제대로 실행되지 않아요({broken.join(", ")}). 편집에서 고치세요.
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
              rule.action,
            ) && (
              <span
                className={`block text-xs ${rule.lastRun.status === "FAILED" ? "text-danger" : "text-muted"}`}
              >
                {resultMessage(
                  rule.lastRun.resultCode,
                  rule.lastRun.status,
                  rule.event,
                  rule.action,
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

function projectOptions(
  projects: readonly {
    readonly id: string;
    readonly key: string;
    readonly name: string;
    readonly archived: boolean;
  }[],
  archived: boolean,
) {
  return projects
    .filter((project) => project.archived === archived)
    .map((project) => ({
      value: project.id,
      label: `${project.key} ${project.name}`,
    }));
}
