"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { projectQueries } from "@/entities/project";
import { CiChip, SignalChip, priorityLabels } from "@/entities/task";
import { isHeadAdmin, type User } from "@/entities/user";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import { formatDate, relativeSince, useLastData } from "@/shared/lib";
import { Icon, Select, Skeleton } from "@/shared/ui";
import { homeQueries, type Attention, type AttentionItem } from "../api/home";
import {
  blockedLabel,
  dueLabel,
  groupByRule,
  itemKey,
  ruleLabels,
} from "../model/attention";
import { Panel, RetryNote, TaskRow } from "./parts";

const projectErrors: Readonly<Record<string, string>> = {
  PROJECT_FORBIDDEN:
    "이 프로젝트의 확인 필요 항목은 PM과 헤드 어드민만 볼 수 있습니다.",
  PROJECT_NOT_FOUND: "프로젝트를 찾을 수 없거나 접근할 수 없습니다.",
  PROJECT_ARCHIVED:
    "아카이브된 프로젝트는 확인 필요 항목을 보여 주지 않습니다.",
};

/**
 * 확인 필요(Needs Attention). 기본은 내 범위(홈 응답), PM·헤드 어드민은 관리하는 프로젝트로 바꿔 볼 수 있다.
 * 범위는 URL `?attention=<projectId>`에 둔다.
 */
export function AttentionSection({
  user,
  mine,
  today,
  now,
}: {
  readonly user: User;
  readonly mine: Attention;
  readonly today: string;
  readonly now: number;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const params = new URLSearchParams(useSearchParams()?.toString());
  const projects = useQuery(projectQueries.list());
  const managed =
    projects.data?.filter(
      (project) =>
        !project.archived &&
        (isHeadAdmin(user) || project.pmUserId === user.id),
    ) ?? [];
  const requested = params.get("attention");
  // 관리하지 않는(또는 사라진) 프로젝트 id가 URL에 남아 있으면 내 범위로 본다.
  const projectId =
    requested && managed.some((project) => project.id === requested)
      ? requested
      : null;
  const project = useQuery({
    ...homeQueries.project(projectId ?? ""),
    enabled: projectId !== null,
  });
  const kept = useLastData(project);
  const attention = projectId ? kept.data : mine;
  const total = attention?.items.length;

  const changeScope = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("attention", value);
    else next.delete("attention");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  return (
    <Panel
      id="home-attention"
      title="확인 필요"
      meta={total === undefined ? undefined : `${total}건`}
      action={
        managed.length > 0 && (
          <Select
            aria-label="확인 필요 범위"
            className="home-scope"
            value={projectId ?? ""}
            onChange={(event) => changeScope(event.target.value)}
          >
            <option value="">내 업무</option>
            {managed.map((item) => (
              <option key={item.id} value={item.id}>
                {item.key} {item.name}
              </option>
            ))}
          </Select>
        )
      }
    >
      {projectId && kept.stale && (
        <RetryNote
          role="status"
          message="최신 목록을 불러오지 못해 마지막으로 받은 목록을 보여 줍니다."
          onRetry={() => void project.refetch()}
        />
      )}
      {projectId && project.isPending ? (
        <div
          role="status"
          aria-label="프로젝트 확인 필요 항목을 불러오는 중"
          className="grid gap-2 p-3"
        >
          <Skeleton className="w-2/3" />
          <Skeleton className="w-1/2" />
        </div>
      ) : projectId && project.isError && !kept.data ? (
        <ProjectError
          error={project.error}
          onRetry={() => void project.refetch()}
        />
      ) : attention && attention.items.length === 0 ? (
        <p className="home-note">
          {projectId
            ? "이 프로젝트에 확인할 항목이 없습니다."
            : "지금 확인할 항목이 없습니다."}
        </p>
      ) : (
        attention &&
        groupByRule(attention).map(({ rule, items }) => (
          <div key={rule} className="home-group">
            <h3>
              {ruleLabels[rule]}{" "}
              <span className="tabular-nums">{attention.counts[rule]}</span>
            </h3>
            <ul>
              {items.map((item) => (
                <AttentionRow
                  key={itemKey(item)}
                  item={item}
                  today={today}
                  now={now}
                  projectScope={projectId !== null}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </Panel>
  );
}

function ProjectError({
  error,
  onRetry,
}: {
  readonly error: unknown;
  readonly onRetry: () => void;
}) {
  const problem = normalizeApiError(error);
  const known = projectErrors[problem.code];
  return known ? (
    <p role="alert" className="home-note">
      {known}
    </p>
  ) : (
    <RetryNote
      role="alert"
      message={`최신 정보를 불러오지 못했습니다. ${problem.message}`}
      onRetry={onRetry}
    />
  );
}

function AttentionRow({
  item,
  today,
  now,
  projectScope,
}: {
  readonly item: AttentionItem;
  readonly today: string;
  readonly now: number;
  readonly projectScope: boolean;
}) {
  if (item.sprint) {
    const sprint = item.sprint;
    return (
      <li className="home-row">
        <Icon name="clock" className="home-row-icon" />
        <Link
          href={routes.projectSprint(sprint.projectId, sprint.id)}
          className="home-row-title"
        >
          <span className="home-row-key">{sprint.projectKey}</span>
          <span className="min-w-0 break-words">{sprint.name}</span>
        </Link>
        <span className="home-row-meta">
          <span
            className={sprint.endDate < today ? "text-danger" : undefined}
            title={`종료일 ${formatDate(sprint.endDate)}`}
          >
            {endLabel(today, sprint.endDate)}
          </span>
          <span>열린 업무 {sprint.openTaskCount}</span>
        </span>
      </li>
    );
  }
  if (!item.task) return null;
  const task = item.task;
  return (
    <TaskRow task={task}>
      {item.rule === "OVERDUE" && item.dueDate && (
        <SignalChip
          tone="danger"
          icon="alert"
          title={`마감 ${formatDate(item.dueDate)}`}
        >
          {dueLabel(today, item.dueDate)}
        </SignalChip>
      )}
      {item.rule === "DUE_SOON" && item.dueDate && (
        <SignalChip
          tone="warning"
          icon="clock"
          title={`마감 ${formatDate(item.dueDate)}`}
        >
          {dueLabel(today, item.dueDate)}
        </SignalChip>
      )}
      {item.rule === "CI_FAILED" && <CiChip status="FAILURE" />}
      {item.rule === "BLOCKED_TOO_LONG" && item.since && (
        <>
          <SignalChip
            tone="danger"
            icon="alert"
            title={`막힘 ${formatDate(item.since)}부터`}
          >
            {blockedLabel(item.since, now)}
          </SignalChip>
          {task.blockedReason && (
            <span className="home-row-reason" title={task.blockedReason}>
              {task.blockedReason}
            </span>
          )}
        </>
      )}
      {item.rule === "HIGH_PRIORITY_UNASSIGNED" && (
        <>
          <span className="priority-label" data-priority={task.priority}>
            {priorityLabels[task.priority]}
          </span>
          <span>담당자 없음</span>
        </>
      )}
      {item.rule === "MERGED_NOT_DONE" && (
        <SignalChip tone="merged" icon="merge" title="PR이 merge됐습니다">
          완료로 옮기세요
        </SignalChip>
      )}
      {item.rule === "REVIEW_OVERDUE" && item.pullRequest && (
        <>
          <a
            href={item.pullRequest.url}
            target="_blank"
            rel="noopener noreferrer"
            className="home-row-link"
            title={item.pullRequest.title}
          >
            {item.pullRequest.repositoryFullName.split("/").pop()} #
            {item.pullRequest.number}
          </a>
          {projectScope && item.pullRequest.reviewerLogin && (
            <span>리뷰어 {item.pullRequest.reviewerLogin}</span>
          )}
          {item.since && (
            <SignalChip tone="danger" icon="clock">
              {relativeSince(item.since, now)} 요청
            </SignalChip>
          )}
        </>
      )}
    </TaskRow>
  );
}

const endLabel = (today: string, date: string) =>
  dueLabel(today, date).replace("마감", "종료");
