"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TaskDetail } from "@/entities/task";
import { suggestsDone, taskKeys } from "@/entities/task";
import { normalizeApiError } from "@/shared/api";
import { repositoryName, useLastData } from "@/shared/lib";
import {
  Badge,
  Button,
  ErrorState,
  Field,
  Select,
  Skeleton,
  useToast,
} from "@/shared/ui";
import { taskGithubApi, taskGithubQueries } from "../api/github";
import { publicationName } from "../model/publication";
import { publicationLabels } from "../model/types";
import { TaskGithubLinks } from "./TaskGithubLinks";

export function TaskGithubPanel({
  task,
  editable,
  onAccessLost,
  onComplete,
  completing = false,
}: {
  readonly task: TaskDetail;
  readonly editable: boolean;
  readonly onAccessLost: (error: unknown) => void;
  /** merge 제안에서 사람이 누르는 완료 이동. 없으면 버튼 대신 안내만 보인다. */
  readonly onComplete?: () => void;
  readonly completing?: boolean;
}) {
  const client = useQueryClient();
  const toast = useToast();
  const github = useQuery(taskGithubQueries.detail(task.id));
  useEffect(() => {
    if (!github.error) return;
    const problem = normalizeApiError(github.error);
    if (problem.status === 403 || problem.status === 404)
      onAccessLost(github.error);
  }, [github.error, onAccessLost]);
  const repositories = useQuery({
    ...taskGithubQueries.repositories(task.projectId ?? ""),
    // 읽기 전용 열람자도 받는다: 서버가 조회자 원본 권한으로 거른 목록이라, 권한 있는 열람자에게는
    // 비공개 발행 대상 이름을 보여 주고 권한 없는 열람자에게는 숨긴다(선택 상자는 편집자만).
    enabled: task.scope === "PROJECT" && !!task.projectId,
  });
  // 일시 장애면 60초까지만 마지막 선택지를 두고, 권한·존재 오류(4xx)면 바로 비운다.
  const { data: repositoryOptions } = useLastData(repositories);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function run(action: () => Promise<unknown>, validating = false) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await action();
      await client.invalidateQueries({ queryKey: taskKeys.all });
      toast("GitHub 연결을 변경했어요.", "success");
    } catch (cause) {
      const problem = normalizeApiError(cause);
      if (validating && [400, 409, 422].includes(problem.status))
        setError(problem.message);
      else toast(problem.message, "error");
      if (problem.status === 403 || problem.status === 404) onAccessLost(cause);
    } finally {
      setPending(false);
    }
  }
  function link(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void run(async () => {
      await taskGithubApi.link(task.id, {
        url: String(data.get("url") ?? ""),
        primary: data.get("primary") === "on",
      });
      form.reset();
    }, true);
  }
  if (github.isPending)
    return (
      <div
        role="status"
        aria-label="GitHub 연결을 불러오는 중"
        className="grid gap-3"
      >
        <Skeleton className="w-40" />
        <Skeleton className="h-24" />
      </div>
    );
  if (github.isError)
    return (
      <ErrorState
        title="GitHub 연결을 불러오지 못했어요"
        description={normalizeApiError(github.error).message}
        onRetry={() => void github.refetch()}
      />
    );
  const publication = github.data.publication;
  const targetLocked = publication && publication.state !== "WAITING";
  const mergedPr = github.data.links.some(
    (item) =>
      item.kind === "PULL_REQUEST" &&
      item.accessible &&
      item.state === "MERGED",
  );
  return (
    <section className="grid gap-4 border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="task-section-title">GitHub</h2>
        {publication && (
          <Badge className="gap-2">
            <span>{publicationLabels[publication.state]}</span>
            <span>{publicationName(publication, repositoryOptions)}</span>
          </Badge>
        )}
      </div>
      {github.data.source && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {github.data.source.private && <Badge>비공개 원본</Badge>}
          <span>
            {repositoryName({
              fullName: github.data.source.repositoryFullName,
            })}
            #{github.data.source.number}
            에서 가져온 업무
            {github.data.source.private &&
              ", 원본 저장소 권한이 있는 참여자에게만 보여요"}
          </span>
        </p>
      )}
      {publication && (
        <div className="grid gap-1 text-sm empty:hidden">
          {publication.publiclyVisible && publication.state !== "SUCCEEDED" && (
            <p className="text-danger">
              공개 저장소라 제목, 설명, 업무 링크가 공개돼요.
            </p>
          )}
          {publication.state === "UNCERTAIN" && (
            <p className="text-muted">발행 결과를 확인하고 있어요.</p>
          )}
          {publication.errorMessage && (
            <p className="text-danger">
              {publication.errorMessage}{" "}
              {publication.errorCode && `(${publication.errorCode})`}
            </p>
          )}
          {publication.state === "FAILED" && editable && (
            <Button
              variant="secondary"
              className="justify-self-start"
              loading={pending}
              onClick={() => void run(() => taskGithubApi.retry(task.id))}
            >
              발행 재시도
            </Button>
          )}
        </div>
      )}
      {editable && task.scope === "PROJECT" && (
        <details className="task-github-disclosure">
          <summary>Issue 발행 설정</summary>
          <Field
            id="publication-target"
            label="Issue 발행 저장소"
            hint={publication ? undefined : "고르는 즉시 Issue로 발행돼요."}
          >
            <Select
              id="publication-target"
              disabled={
                pending ||
                !!targetLocked ||
                repositories.isPending ||
                repositories.isError
              }
              value={publication?.projectRepositoryId ?? ""}
              onChange={(event) =>
                void run(() =>
                  taskGithubApi.target(task.id, event.target.value || null),
                )
              }
            >
              <option value="">발행하지 않음</option>
              {publication &&
                !repositoryOptions?.some(
                  (repository) =>
                    repository.id === publication.projectRepositoryId,
                ) && (
                  // 지금 발행 대상이 목록에서 빠졌으면(비공개 전환·권한 없음) 이름 없이 자리만 둔다.
                  <option value={publication.projectRepositoryId} disabled>
                    {publicationName(publication, repositoryOptions)}
                  </option>
                )}
              {repositoryOptions?.map((repository) => (
                <option key={repository.id} value={repository.id}>
                  {repositoryName(repository)}
                  {repository.private ? "" : ", 공개"}
                </option>
              ))}
            </Select>
          </Field>
        </details>
      )}
      {repositories.isError && editable && (
        <ErrorState
          title="발행 저장소를 불러오지 못했어요"
          onRetry={() => void repositories.refetch()}
        />
      )}
      {suggestsDone(mergedPr, task.status) && (
        <div className="signal-suggest" role="status">
          <p className="min-w-0 text-sm">
            연결된 PR이 merge됐어요. 업무 상태는 자동으로 바뀌지 않아요.
          </p>
          {editable && onComplete ? (
            <Button
              variant="secondary"
              className="ui-button-sm shrink-0"
              loading={completing}
              onClick={onComplete}
            >
              완료로 옮기기
            </Button>
          ) : (
            <p className="text-xs text-muted">
              수정 권한이 있는 참여자가 완료로 옮길 수 있어요.
            </p>
          )}
        </div>
      )}
      <TaskGithubLinks
        links={github.data.links}
        editable={editable}
        pending={pending}
        error={error}
        onLink={link}
        onUnlink={(id) => void run(() => taskGithubApi.unlink(task.id, id))}
      />
    </section>
  );
}
