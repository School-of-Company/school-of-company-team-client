"use client";

import type { FormEvent } from "react";
import { Badge, Button, Checkbox, Input } from "@/shared/ui";
import { repositoryName } from "@/shared/lib";
import { linkStateLabels, type TaskGithub } from "../model/types";
import { PullRequestSignals } from "./PullRequestSignals";

export function TaskGithubLinks({
  links,
  editable,
  pending,
  error,
  onLink,
  onUnlink,
}: {
  readonly links: TaskGithub["links"];
  readonly editable: boolean;
  readonly pending: boolean;
  readonly error: string;
  readonly onLink: (event: FormEvent<HTMLFormElement>) => void;
  readonly onUnlink: (id: string) => void;
}) {
  const linkedPrimary = links.some((item) => item.primary);
  return (
    <div className="grid gap-2">
      {links.length === 0 ? (
        <p className="text-sm text-muted">연결된 Issue/PR 없음</p>
      ) : (
        <ul className="grid gap-1">
          {links.map((item) => (
            <li key={item.id} className="github-link-row">
              <div className="flex min-w-0 items-center justify-between gap-2">
                {item.accessible && item.url ? (
                  <a
                    className="min-w-0 truncate text-sm hover:underline"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.title ?? undefined}
                  >
                    <span className="text-muted">
                      {repositoryName({ fullName: item.repositoryFullName })} #
                      {item.number}
                    </span>{" "}
                    {item.title}
                    {item.primary && (
                      <span
                        className="ml-2"
                        title="이 업무를 대표하는 Issue예요. 업무당 하나만 지정할 수 있어요."
                      >
                        <Badge>대표 Issue</Badge>
                      </span>
                    )}
                    {item.state && (
                      <span className="ml-2 text-xs text-muted">
                        {linkStateLabels[item.state]}
                      </span>
                    )}
                  </a>
                ) : (
                  <span className="text-sm text-muted">
                    접근 권한 없음, GitHub 권한을 확인해 주세요
                  </span>
                )}
                {editable && (
                  <Button
                    variant="ghost"
                    className="shrink-0"
                    disabled={pending}
                    aria-label={`${item.kind === "ISSUE" ? "Issue" : "PR"} #${item.number ?? ""} 연결 해제`}
                    onClick={() => onUnlink(item.id)}
                  >
                    해제
                  </Button>
                )}
              </div>
              {item.kind === "PULL_REQUEST" && item.accessible && (
                <PullRequestSignals
                  signal={item.pullRequest}
                  merged={item.state === "MERGED"}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <details className="task-github-disclosure">
          <summary>Issue, PR 연결</summary>
          <form className="grid gap-2" onSubmit={onLink}>
            <div className="flex gap-2">
              <Input
                id="github-link-url"
                name="url"
                type="url"
                required
                aria-invalid={!!error}
                aria-describedby={error ? "github-link-error" : undefined}
                maxLength={500}
                aria-label="기존 Issue, PR URL"
                placeholder="Issue, PR URL 붙여넣기"
                className="min-w-0 flex-1"
              />
              <Button type="submit" variant="secondary" loading={pending}>
                연결
              </Button>
            </div>
            {error && (
              <p
                id="github-link-error"
                role="alert"
                className="text-sm text-danger"
              >
                {error}
              </p>
            )}
            {!linkedPrimary && (
              <label
                className="flex items-center gap-2 text-xs text-muted"
                title="업무당 하나의 Issue를 대표로 지정할 수 있어요."
              >
                <Checkbox name="primary" />
                대표 Issue로 지정
              </label>
            )}
          </form>
        </details>
      )}
    </div>
  );
}
