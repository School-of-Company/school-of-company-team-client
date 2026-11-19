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
import { Button, Dialog, ErrorState, Skeleton } from "@/shared/ui";
import { useSprintLifecycle, useUpdateSprint } from "../api/sprint-actions";
import { formatRange, remainingLabel } from "../model/dates";
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
  if (sprint.isPending)
    return (
      <div
        role="status"
        aria-label="스프린트 불러오는 중"
        className="grid gap-3"
      >
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <Skeleton className="h-40" />
      </div>
    );
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
          Sprint 목록으로
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
            <h2 id="sprint-title" className="text-lg font-semibold break-words">
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
        </p>
        {sprint.goal ? (
          <p className="sprint-goal">{sprint.goal}</p>
        ) : (
          <p className="text-sm text-muted">목표가 없습니다.</p>
        )}
        {sprint.status !== "PLANNED" && (
          <ProgressBar
            done={progress.done}
            total={progress.total}
            label={`${sprint.name} 완료 비율`}
          />
        )}
        {manages && otherActive && sprint.status === "PLANNED" && (
          <p id="start-blocked" className="text-sm text-muted">
            진행 중인 Sprint(
            <Link
              href={routes.projectSprint(project.id, otherActive.id)}
              className="underline"
            >
              {otherActive.name}
            </Link>
            )를 종료한 뒤 시작할 수 있습니다.
          </p>
        )}
        {!manages && sprint.status !== "CLOSED" && !project.archived && (
          <p className="text-sm text-muted">
            Sprint 범위와 시작·종료는 PM 또는 헤드 어드민이 정합니다.
          </p>
        )}
      </section>
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`text-sm ${message.tone === "error" ? "text-danger" : ""}`}
        >
          {message.text}
        </p>
      )}
      <nav aria-label="스프린트 화면" className="settings-nav">
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
            >
              {sprintTabLabels[value]}
            </Link>
          );
        })}
      </nav>
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
                  text: `스프린트를 종료했습니다. 미완료 업무 이월 ${result.carryOvers.length}건을 기록했습니다.`,
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
          {sprint.name}을(를) 삭제하면 넣어 둔 업무는 Sprint에서만 빠지고 그대로
          남습니다.
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
