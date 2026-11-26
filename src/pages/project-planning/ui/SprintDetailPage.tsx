"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  seoulToday,
  sprintErrorMessage,
  sprintProgress,
  sprintQueries,
  type Sprint,
} from "@/entities/sprint";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import { formatDate } from "@/shared/lib";
import {
  Button,
  Dialog,
  ErrorState,
  ListSkeleton,
  Markdown,
} from "@/shared/ui";
import { useSprintLifecycle, useUpdateSprint } from "../api/sprint-actions";
import { formatRange, remainingLabel } from "../model/dates";
import { percent } from "../model/goal-items";
import { selectedSprintTab, sprintTabLabels, sprintTabs } from "../model/tabs";
import { CloseSprintDialog } from "./CloseSprintDialog";
import { ProgressBar } from "./ProgressBar";
import { ProjectFrame, type PlanningContext } from "./ProjectFrame";
import { SprintFormDialog } from "./SprintFormDialog";
import { SprintPlan } from "./SprintPlan";
import { SprintProgress } from "./SprintProgress";
import { SprintRetro } from "./SprintRetro";
import { SprintReviewPanel } from "./SprintReviewPanel";
import { SprintStatusBadge } from "./SprintStatus";

export function SprintDetailPage({
  projectId,
  sprintId,
}: {
  readonly projectId: string;
  readonly sprintId: string;
}) {
  return (
    <ProjectFrame
      projectId={projectId}
      trail={[{ label: "스프린트", href: routes.projectSprints(projectId) }]}
    >
      {(context) => <SprintDetail {...context} sprintId={sprintId} />}
    </ProjectFrame>
  );
}

function SprintDetail(props: PlanningContext & { readonly sprintId: string }) {
  const { project, sprintId } = props;
  const sprint = useQuery(sprintQueries.detail(project.id, sprintId));
  // 시작 막힘 안내는 스프린트 목록(다른 진행 중 스프린트)으로 정한다. 목록까지 받은 뒤 한 번에 그려 안내가 늦게 끼지 않게 한다.
  const sprints = useQuery(sprintQueries.list(project.id));
  if (sprint.isPending || sprints.isPending) return <SprintDetailSkeleton />;
  if (sprint.isError) {
    const problem = normalizeApiError(sprint.error);
    return (
      <div className="grid justify-items-center gap-2">
        <ErrorState
          title={
            problem.status === 404
              ? "스프린트를 찾을 수 없습니다"
              : "스프린트를 불러오지 못했습니다"
          }
          description={sprintErrorMessage(problem)}
          onRetry={
            problem.status === 404 ? undefined : () => void sprint.refetch()
          }
        />
        <Link
          href={routes.projectSprints(project.id)}
          className="text-sm underline"
        >
          스프린트 목록으로
        </Link>
      </div>
    );
  }
  return <SprintScreen {...props} sprint={sprint.data} />;
}

function SprintScreen({
  project,
  user,
  manages,
  writes,
  sprint,
}: PlanningContext & { readonly sprint: Sprint }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const tab = selectedSprintTab(sprint.status, search?.get("tab"));
  const sprints = useQuery(sprintQueries.list(project.id));
  const { start, close, remove } = useSprintLifecycle(project.id, sprint.id);
  const update = useUpdateSprint(project.id, sprint.id);
  const [editing, setEditing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{
    readonly tone: "ok" | "error";
    readonly text: string;
  } | null>(null);
  const today = seoulToday();
  const progress = sprintProgress(sprint.counts);
  const otherActive = sprints.data?.find(
    (item) => item.status === "ACTIVE" && item.id !== sprint.id,
  );
  const startBlocked =
    manages && sprint.status === "PLANNED" ? otherActive : undefined;
  function goTab(next: string) {
    const params = new URLSearchParams(search?.toString());
    params.set("tab", next);
    router.replace(`${pathname}?${params}`, { scroll: false });
  }
  const fail = (cause: unknown) =>
    setMessage({
      tone: "error",
      text: sprintErrorMessage(normalizeApiError(cause)),
    });
  return (
    <>
      <section className="sprint-head" aria-labelledby="sprint-title">
        <div className="sprint-head-row">
          <div className="sprint-head-title">
            <h2
              id="sprint-title"
              className="text-lg font-semibold wrap-anywhere"
            >
              {sprint.name}
            </h2>
            <SprintStatusBadge status={sprint.status} />
          </div>
          {manages && sprint.status !== "CLOSED" && (
            <div className="flex flex-wrap gap-2">
              {sprint.status === "PLANNED" ? (
                <Button
                  loading={start.isPending}
                  disabled={!!otherActive}
                  aria-describedby={otherActive ? "start-blocked" : undefined}
                  onClick={() => {
                    setMessage(null);
                    start.mutate(undefined, {
                      onSuccess: () => {
                        setMessage({
                          tone: "ok",
                          text: "스프린트를 시작했습니다.",
                        });
                        goTab("progress");
                      },
                      onError: fail,
                    });
                  }}
                >
                  시작
                </Button>
              ) : (
                <Button onClick={() => setClosing(true)}>종료</Button>
              )}
              <Button variant="secondary" onClick={() => setEditing(true)}>
                수정
              </Button>
              {sprint.status === "PLANNED" && (
                <Button variant="ghost" onClick={() => setDeleting(true)}>
                  삭제
                </Button>
              )}
            </div>
          )}
        </div>
        <p className="sprint-meta">
          <span>{formatRange(sprint.startDate, sprint.endDate)}</span>
          {sprint.status === "ACTIVE" && (
            <span>{remainingLabel(sprint.endDate, today)}</span>
          )}
          {sprint.status === "CLOSED" && sprint.closedAt && (
            <span>{formatDate(sprint.closedAt)} 종료</span>
          )}
          {sprint.goalItems.length > 0 && (
            <span className="tabular-nums">
              목표 {sprint.goalItems.filter((item) => item.achieved).length}/
              {sprint.goalItems.length} 달성
              {sprint.goalAchievedRate !== null &&
                ` (${percent(sprint.goalAchievedRate)}%)`}
            </span>
          )}
        </p>
        {sprint.goal ? (
          <div className="sprint-goal">
            <Markdown>{sprint.goal}</Markdown>
          </div>
        ) : (
          // 목표가 있을 때(Markdown)와 같은 줄 높이를 쓴다.
          <div className="sprint-goal">
            <div className="ui-markdown">
              <p className="text-muted">목표가 없습니다.</p>
            </div>
          </div>
        )}
        {/* 진행률 줄과 안내 줄은 상태와 상관없이 자리를 둔다(대기 자리와 같은 높이, 안내가 늦게 끼지 않음). */}
        <div className="sprint-progress-slot">
          {sprint.status === "PLANNED" ? (
            <span className="planning-note">
              시작하면 완료 비율을 보여 줍니다.
            </span>
          ) : (
            <ProgressBar
              done={progress.done}
              total={progress.total}
              label={`${sprint.name} 완료 비율`}
            />
          )}
        </div>
        <p
          id={startBlocked ? "start-blocked" : undefined}
          className="sprint-head-note"
        >
          {startBlocked ? (
            <>
              진행 중인 스프린트(
              <Link
                href={routes.projectSprint(project.id, startBlocked.id)}
                className="underline"
              >
                {startBlocked.name}
              </Link>
              )를 종료한 뒤 시작할 수 있습니다.
            </>
          ) : (
            !manages &&
            sprint.status !== "CLOSED" &&
            !project.archived &&
            "스프린트 범위와 시작, 종료는 PM 또는 헤드 어드민이 정합니다."
          )}
        </p>
      </section>
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`text-sm ${message.tone === "error" ? "text-danger" : ""}`}
        >
          {message.text}
        </p>
      )}
      {/* 같은 화면의 보기 전환: 머리 아래 툴바 줄의 세그먼트(SegmentedLinks 모양). 주소만 바꾸고 스크롤은 그대로 둔다. */}
      <div className="page-toolbar">
        <nav aria-label="스프린트 화면" className="ui-segmented">
          {sprintTabs(sprint.status).map((value) => {
            const params = new URLSearchParams(search?.toString());
            params.set("tab", value);
            return (
              <Link
                key={value}
                href={`${pathname}?${params}`}
                scroll={false}
                replace
                aria-current={tab === value ? "page" : undefined}
                className="ui-segmented-option"
              >
                {sprintTabLabels[value]}
              </Link>
            );
          })}
        </nav>
      </div>
      {tab === "plan" && (
        <SprintPlan project={project} sprint={sprint} manages={manages} />
      )}
      {tab === "progress" && (
        <SprintProgress project={project} sprint={sprint} />
      )}
      {tab === "review" && (
        <SprintReviewPanel
          project={project}
          sprint={sprint}
          manages={manages}
        />
      )}
      {tab === "retro" && (
        <SprintRetro
          project={project}
          sprint={sprint}
          user={user}
          writes={writes}
          manages={manages}
        />
      )}
      {editing && (
        <SprintFormDialog
          open={editing}
          initial={sprint}
          defaults={{ startDate: sprint.startDate, endDate: sprint.endDate }}
          onClose={() => setEditing(false)}
          onSubmit={async (input) => {
            await update.mutateAsync(input);
            setMessage({ tone: "ok", text: "스프린트를 수정했습니다." });
          }}
        />
      )}
      {closing && (
        <CloseSprintDialog
          project={project}
          sprint={sprint}
          sprints={sprints.data ?? []}
          pending={close.isPending}
          onClose={() => {
            if (!close.isPending) setClosing(false);
          }}
          onSubmit={(body, onError) =>
            close.mutate(body, {
              onSuccess: (result) => {
                setClosing(false);
                setMessage({
                  tone: "ok",
                  text: [
                    `스프린트를 종료했습니다. 미완료 업무 이월 ${result.carryOvers.length}건을 기록했습니다.`,
                    result.nextSprint &&
                      `다음 스프린트 ${result.nextSprint.name}을(를) ${result.nextSprint.status === "ACTIVE" ? "만들고 시작했습니다" : "만들었습니다"}.`,
                    "결과 보고 초안을 다듬어 게시하세요.",
                  ]
                    .filter(Boolean)
                    .join(" "),
                });
                goTab("review");
              },
              onError,
            })
          }
        />
      )}
      <Dialog
        open={deleting}
        onClose={() => {
          if (!remove.isPending) setDeleting(false);
        }}
        title="스프린트를 삭제할까요?"
      >
        <p className="mb-6 text-sm text-muted">
          {sprint.name}을(를) 삭제하면 넣어 둔 업무는 스프린트에서만 빠지고
          그대로 남습니다.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            disabled={remove.isPending}
            onClick={() => setDeleting(false)}
          >
            취소
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() =>
              remove.mutate(undefined, {
                onSuccess: () => router.push(routes.projectSprints(project.id)),
                onError: (cause) => {
                  setDeleting(false);
                  fail(cause);
                },
              })
            }
          >
            삭제
          </Button>
        </div>
      </Dialog>
    </>
  );
}

/**
 * 스프린트 머리와 탭 줄의 대기 자리. 머리는 상태와 상관없이 같은 줄 수(제목 줄, 기간, 목표, 진행률 줄, 안내 줄)라
 * 예정, 진행 중, 종료 어느 스프린트를 받아도 탭 줄이 움직이지 않는다.
 */
function SprintDetailSkeleton() {
  return (
    <div role="status" aria-label="스프린트 불러오는 중" className="contents">
      <div aria-hidden="true" className="sprint-head">
        <div className="sprint-head-row">
          <h2 className="text-lg font-semibold">
            <span className="ui-skeleton-text">스프린트 이름</span>
          </h2>
        </div>
        <p className="sprint-meta">
          <span className="ui-skeleton-text">11월 1일 – 11월 14일</span>
        </p>
        <div className="sprint-goal">
          <div className="ui-markdown">
            <p>
              <span className="ui-skeleton-text">스프린트 목표</span>
            </p>
          </div>
        </div>
        <p className="sprint-progress-slot">
          <span className="ui-skeleton-text">완료 비율</span>
        </p>
        <p className="sprint-head-note" />
      </div>
      <div aria-hidden="true" className="page-toolbar">
        <span className="ui-segmented">
          {["계획", "진행", "결과 보고", "회고"].map((label) => (
            <span key={label} className="ui-segmented-option">
              <span className="ui-skeleton-text">{label}</span>
            </span>
          ))}
        </span>
      </div>
      <ListSkeleton label="스프린트 업무 불러오는 중" />
    </div>
  );
}
