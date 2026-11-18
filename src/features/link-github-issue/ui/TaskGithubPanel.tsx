"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TaskDetail } from "@/entities/task";
import { taskKeys } from "@/entities/task";
import { normalizeApiError } from "@/shared/api";
import {
  Button,
  Checkbox,
  ErrorState,
  Field,
  Input,
  Select,
  Spinner,
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
  if (github.isPending) return <Spinner label="GitHub 연결을 불러오는 중" />;
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
  return (
    <section className="grid gap-5 border-t border-border pt-6">
      <h2 className="text-lg font-semibold">GitHub Issue · PR</h2>
      {publication && (
        <div className="grid gap-2 text-sm">
          <p className="font-semibold">
            {publicationLabels[publication.state]} ·{" "}
            {publication.repositoryFullName}
          </p>
          {publication.publiclyVisible && (
            <p className="text-danger">
              {publication.state === "SUCCEEDED"
                ? "공개 저장소에 발행됨"
                : "공개 저장소 발행 시 제목·설명·업무 링크가 공개됩니다."}
            </p>
          )}
          {publication.state === "WAITING" && (
            <p className="text-muted">
              진행 예정 이상으로 변경하면 Issue 발행이 시작됩니다.
            </p>
          )}
          {publication.state === "UNCERTAIN" && (
            <p className="text-muted">
              발행 결과를 확인하고 있습니다. 확인 없이 새 Issue를 만들지
              않습니다.
            </p>
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
          label="발행 저장소"
          hint={
            task.status === "BACKLOG"
              ? "검토 필요에서는 발행을 기다립니다. 진행 예정 이상으로 변경하면 발행합니다."
              : "저장소를 선택하면 Issue 발행이 시작됩니다."
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
              <option
                key={repository.id}
                value={repository.id}
                disabled={!repository.publishable}
              >
                {repository.fullName}
                {repository.private ? " (비공개)" : " (공개: 업무 내용 공개)"}
                {!repository.publishable ? " · 발행 불가" : ""}
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
      {github.data.links.length === 0 ? (
        <p className="text-sm text-muted">연결된 Issue·PR이 없습니다.</p>
      ) : (
        <ul className="grid gap-3">
          {github.data.links.map((item) => (
            <li
              key={item.id}
              className="flex min-w-0 flex-wrap items-center justify-between gap-2"
            >
              <div className="min-w-0 text-sm">
                {item.accessible && item.url ? (
                  <a
                    className="inline-flex min-h-11 items-center break-all text-brand underline"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.primary ? "주 Issue · " : ""}
                    {item.kind === "ISSUE" ? "Issue" : "PR"}{" "}
                    {item.repositoryFullName} #{item.number} · {item.title}
                  </a>
                ) : (
                  <span>
                    원본 접근 권한을 확인할 수 없습니다. GitHub 권한을 확인해
                    주세요.
                  </span>
                )}
                {item.accessible && (
                  <p className="text-xs text-muted">
                    원본 상태: {item.state ?? "확인 중"}
                  </p>
                )}
              </div>
              {editable && (
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    void run(() => taskGithubApi.unlink(task.id, item.id))
                  }
                >
                  연결 해제
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <form className="grid gap-3" onSubmit={link}>
          <Field id="github-link-url" label="기존 Issue·PR URL">
            <Input
              id="github-link-url"
              name="url"
              type="url"
              required
              maxLength={500}
              placeholder="https://github.com/org/repo/issues/1"
            />
          </Field>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <Checkbox
              name="primary"
              disabled={github.data.links.some((item) => item.primary)}
            />
            주 Issue로 연결 (업무당 하나)
          </label>
          <Button type="submit" variant="secondary" loading={pending}>
            링크 연결
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
