"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TaskDetail } from "@/entities/task";
import { taskKeys } from "@/entities/task";
import { normalizeApiError } from "@/shared/api";
import {
  Badge,
  Button,
  Checkbox,
  ErrorState,
  Field,
  Input,
  Select,
  Skeleton,
} from "@/shared/ui";
import { taskGithubApi, taskGithubQueries } from "../api/github";
import { publicationLabels } from "../model/types";

export function TaskGithubPanel({
  task,
  editable,
  onAccessLost,
}: {
  readonly task: TaskDetail;
  readonly editable: boolean;
  readonly onAccessLost: (error: unknown) => void;
}) {
  const client = useQueryClient();
  const github = useQuery(taskGithubQueries.detail(task.id));
  useEffect(() => {
    if (!github.error) return;
    const problem = normalizeApiError(github.error);
    if (problem.status === 403 || problem.status === 404)
      onAccessLost(github.error);
  }, [github.error, onAccessLost]);
  const repositories = useQuery({
    ...taskGithubQueries.repositories(task.projectId ?? ""),
    enabled: editable && task.scope === "PROJECT" && !!task.projectId,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function run(action: () => Promise<unknown>) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await action();
      await client.invalidateQueries({ queryKey: taskKeys.all });
    } catch (cause) {
      const problem = normalizeApiError(cause);
      setError(problem.message);
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
    });
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
        title="GitHub 연결을 불러오지 못했습니다"
        description={normalizeApiError(github.error).message}
        onRetry={() => void github.refetch()}
      />
    );
  const publication = github.data.publication;
  const targetLocked = publication && publication.state !== "WAITING";
  const linkedPrimary = github.data.links.some((item) => item.primary);
  return (
    <section className="grid gap-4 border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">GitHub</h2>
        {publication && (
          <Badge>
            {publicationLabels[publication.state]} ·{" "}
            {publication.repositoryFullName}
          </Badge>
        )}
      </div>
      {github.data.source && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {github.data.source.private && <Badge>비공개 원본</Badge>}
          <span>
            {github.data.source.repositoryFullName}#{github.data.source.number}
            에서 가져온 업무
            {github.data.source.private &&
              " · 원본 저장소 권한이 있는 참여자에게만 보여요"}
          </span>
        </p>
      )}
      {publication && (
        <div className="grid gap-1 text-sm empty:hidden">
          {publication.publiclyVisible && publication.state !== "SUCCEEDED" && (
            <p className="text-danger">
              공개 저장소라 제목·설명·업무 링크가 공개됩니다.
            </p>
          )}
          {publication.state === "UNCERTAIN" && (
            <p className="text-muted">발행 결과를 확인하고 있습니다.</p>
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
        <Field
          id="publication-target"
          label="Issue 발행 저장소"
          hint={
            task.status === "BACKLOG"
              ? "진행 예정으로 옮기면 발행됩니다."
              : undefined
          }
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
            {repositories.data?.map((repository) => (
              <option key={repository.id} value={repository.id}>
                {repository.fullName}
                {repository.private ? "" : " · 공개"}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {repositories.isError && editable && (
        <ErrorState
          title="발행 저장소를 불러오지 못했습니다"
          onRetry={() => void repositories.refetch()}
        />
      )}
      {task.scope !== "PROJECT" && (
        <p className="text-sm text-muted">
          팀 공용·개인 업무는 자동 발행하지 않습니다.
        </p>
      )}
      <div className="grid gap-2">
        <h3 className="text-sm font-medium">연결된 Issue · PR</h3>
        {github.data.links.length === 0 ? (
          <p className="text-sm text-muted">없음</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {github.data.links.map((item) => (
              <li
                key={item.id}
                className="flex min-w-0 items-center justify-between gap-2 px-3 py-2"
              >
                {item.accessible && item.url ? (
                  <a
                    className="min-w-0 truncate text-sm hover:underline"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.title ?? undefined}
                  >
                    <span className="text-muted">
                      {item.kind === "ISSUE" ? "Issue" : "PR"} #{item.number}
                    </span>{" "}
                    {item.title}
                    {item.primary && <Badge className="ml-2">주</Badge>}
                    {item.state && (
                      <span className="ml-2 text-xs text-muted">
                        {item.state}
                      </span>
                    )}
                  </a>
                ) : (
                  <span className="text-sm text-muted">
                    접근 권한 없음 · GitHub 권한을 확인해 주세요
                  </span>
                )}
                {editable && (
                  <Button
                    variant="ghost"
                    className="shrink-0"
                    disabled={pending}
                    onClick={() =>
                      void run(() => taskGithubApi.unlink(task.id, item.id))
                    }
                  >
                    해제
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {editable && (
          <form className="grid gap-2" onSubmit={link}>
            <div className="flex gap-2">
              <Input
                id="github-link-url"
                name="url"
                type="url"
                required
                maxLength={500}
                aria-label="기존 Issue·PR URL"
                placeholder="Issue·PR URL 붙여넣기"
                className="min-w-0 flex-1"
              />
              <Button type="submit" variant="secondary" loading={pending}>
                연결
              </Button>
            </div>
            {!linkedPrimary && (
              <label className="flex items-center gap-2 text-xs text-muted">
                <Checkbox name="primary" />주 Issue로 연결
              </label>
            )}
          </form>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
