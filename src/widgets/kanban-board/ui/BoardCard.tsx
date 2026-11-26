"use client";

import Link from "next/link";
import {
  CiChip,
  ReviewChip,
  SignalChip,
  priorityLabels,
  sizeLabels,
  suggestsDone,
  type TaskCard,
  type TaskStatus,
} from "@/entities/task";
import { formatDate } from "@/shared/lib";
import { BoardCardMenu } from "./BoardCardMenu";

const shortDate = (value: string) => formatDate(value, { year: undefined });

export function BoardCard({
  task,
  editable,
  manual,
  pending,
  onMove,
  onOrder,
  onSelect,
}: {
  readonly task: TaskCard;
  readonly editable: boolean;
  readonly manual: boolean;
  readonly pending: boolean;
  readonly onMove: (status: TaskStatus) => void;
  readonly onOrder: (direction: "up" | "down") => void;
  readonly onSelect?: (id: string) => void;
}) {
  const source =
    task.projectName ?? (task.scope === "PERSONAL" ? "개인 업무" : "팀 공용");
  return (
    <article className="board-card relative min-w-0 border">
      <div className="board-card-top">
        <span className="min-w-0 truncate">
          {task.key ? <span className="font-mono">{task.key}</span> : source}
          {task.key && <span className="sr-only">{source}</span>}
        </span>
        <BoardCardMenu
          task={task}
          editable={editable}
          manual={manual}
          pending={pending}
          onMove={onMove}
          onOrder={onOrder}
        />
      </div>
      <Link
        href={`/tasks/${encodeURIComponent(task.id)}`}
        className="board-card-title"
        onClick={(event) => {
          if (
            onSelect &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey &&
            window.matchMedia("(min-width: 768px)").matches
          ) {
            event.preventDefault();
            event.currentTarget.focus();
            onSelect(task.id);
          }
        }}
      >
        {task.title}
      </Link>
      {task.issue && (
        <p
          className="board-card-issue"
          title={`${task.issue.repositoryFullName} #${task.issue.number}`}
        >
          <span className="truncate">
            {task.issue.repositoryFullName.split("/").pop()}
          </span>
          <span className="shrink-0">
            {task.issue.kind === "PR" ? "PR " : ""}#{task.issue.number}
          </span>
        </p>
      )}
      <CardSignals task={task} />
      <div className="board-card-meta">
        <span className="min-w-0 truncate" aria-label="담당자">
          {task.assignees.map((person) => person.name).join(", ") || "미지정"}
        </span>
        <span className="board-card-badges">
          {task.size && (
            <span
              className="board-card-size"
              title={`크기 ${task.size} ${sizeLabels[task.size]}`}
            >
              <span className="sr-only">크기 </span>
              {task.size}
            </span>
          )}
          <span
            className="priority-label"
            data-priority={task.priority}
            title={`우선순위 ${task.priority}`}
          >
            {priorityLabels[task.priority]}
          </span>
        </span>
      </div>
      {task.status === "REVIEW" && !!task.reviewers?.length && (
        <p className="board-card-note board-card-reviewers">
          <span className="sr-only">리뷰어</span>
          <span aria-hidden="true">리뷰</span>{" "}
          {task.reviewers.map((person) => person.name).join(", ")}
        </p>
      )}
      {(task.startDate || task.deadline) && (
        <p className="board-card-note">
          {task.startDate && task.deadline
            ? `${shortDate(task.startDate)} ~ ${shortDate(task.deadline)}`
            : task.deadline
              ? `마감 ${formatDate(task.deadline)}`
              : `시작 ${formatDate(task.startDate)}`}
        </p>
      )}
      {task.blocked && (
        <p className="board-card-note wrap-anywhere text-danger">
          막힘{task.blockedReason ? ": " + task.blockedReason : ""}
        </p>
      )}
    </article>
  );
}

// NONE은 알릴 것이 없어 숨긴다. merge 제안은 완료 전일 때만 보이고 이동은 카드 메뉴, 상세에서 사람이 한다.
function CardSignals({ task }: { readonly task: TaskCard }) {
  const signal = task.devSignal;
  if (!signal) return null;
  const suggest = suggestsDone(signal.merged, task.status);
  const chips = [
    signal.ci !== "NONE" && <CiChip key="ci" status={signal.ci} />,
    signal.review !== "NONE" && (
      <ReviewChip key="review" signal={signal.review} />
    ),
    signal.openPullRequests > 1 && (
      <SignalChip
        key="count"
        tone="muted"
        icon="merge"
        title={`열린 PR ${signal.openPullRequests}개의 가장 나쁜 신호`}
      >
        PR {signal.openPullRequests}
      </SignalChip>
    ),
  ].filter(Boolean);
  if (chips.length === 0 && !suggest) return null;
  return (
    <div className="board-card-signals" role="group" aria-label="개발 신호">
      {chips}
      {suggest && (
        <SignalChip tone="merged" icon="merge" title="PR이 merge됐어요">
          merge됨, 완료로 옮기세요
        </SignalChip>
      )}
    </div>
  );
}
