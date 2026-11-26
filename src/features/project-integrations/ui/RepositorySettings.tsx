"use client";

import { useState } from "react";
import { githubErrorMessage } from "../model/github-error";
import { ImportStatus } from "./ImportStatus";
import { RepositoryLinkForm } from "./RepositoryLinkForm";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  InfoTip,
  ListSkeleton,
  Select,
} from "@/shared/ui";
import { repositoryName } from "@/shared/lib";
import {
  useInstallableRepositories,
  useProjectRepositories,
  useRepositoryChange,
} from "../api/integrations";

export function RepositorySettings({
  projectId,
  projectKey,
  disabled,
}: {
  readonly projectId: string;
  readonly projectKey: string;
  readonly disabled: boolean;
}) {
  const repositories = useProjectRepositories(projectId, true);
  const installable = useInstallableRepositories(projectId, !disabled);
  const change = useRepositoryChange(projectId);
  const [editing, setEditing] = useState(false);
  // 일괄 연결이 도는 동안 폼이 닫혀 요청이 화면 밖에서 이어지지 않게 여기서 들고 있다.
  const [linking, setLinking] = useState(false);
  if (repositories.isPending || (!disabled && installable.isPending))
    return (
      <ListSkeleton label="저장소 불러오는 중" rows={2} rowClassName="h-14" />
    );
  if (repositories.isError)
    return (
      <ErrorState
        description={githubErrorMessage(repositories.error)}
        onRetry={() => void repositories.refetch()}
      />
    );
  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1 text-sm text-muted">
          연결 {repositories.data.length}개
          <InfoTip label="저장소 연결 설명">
            저장소 접근에는 GitHub App 설치가 따로 필요해요. 설치에서 허용한
            저장소만 연결할 수 있어요. 기본 발행 저장소는 새 업무의 선택
            기본값이고, 기존 업무를 발행하지 않아요.
          </InfoTip>
        </span>
        {!disabled && (
          <Button
            variant={editing ? "ghost" : "secondary"}
            className="ui-button-sm"
            disabled={change.isPending}
            aria-disabled={linking || undefined}
            aria-expanded={editing}
            title={
              linking
                ? "저장소 연결이 끝나거나 취소한 뒤 닫을 수 있어요"
                : undefined
            }
            onClick={() => {
              if (linking) return;
              change.reset();
              setEditing(!editing);
            }}
          >
            {editing ? "닫기" : "저장소 연결"}
          </Button>
        )}
      </div>
      {!disabled && installable.isError && (
        <ErrorState
          description={githubErrorMessage(installable.error)}
          onRetry={() => void installable.refetch()}
        />
      )}
      {!disabled && editing && installable.data && (
        <RepositoryLinkForm
          projectId={projectId}
          installable={installable.data}
          linked={repositories.data}
          running={linking}
          onRunningChange={setLinking}
        />
      )}
      {repositories.data.length === 0 ? (
        <EmptyState
          title="연결된 저장소가 없어요"
          description="GitHub App 설치에서 저장소를 허용한 뒤 연결하세요."
        />
      ) : (
        <ul className="settings-list" aria-label="연결된 저장소">
          {repositories.data.map((repo) => (
            <li key={repo.id} className="settings-list-row">
              <div className="settings-list-main">
                <span className="settings-list-name">
                  <span>{repositoryName(repo)}</span>
                  <Badge>{repo.private ? "비공개" : "공개"}</Badge>
                  {repo.isDefault && (
                    <Badge className="badge-blue">기본 발행</Badge>
                  )}
                </span>
                <ImportStatus
                  projectId={projectId}
                  projectKey={projectKey}
                  repository={repo}
                  disabled={disabled}
                />
              </div>
              {!disabled && (
                <div className="settings-list-actions">
                  <Button
                    variant="ghost"
                    className="ui-button-sm"
                    disabled={change.isPending}
                    onClick={() =>
                      change.mutate({
                        action: "unlink",
                        projectRepositoryId: repo.id,
                      })
                    }
                    aria-label={`${repositoryName(repo)} 연결 해제`}
                  >
                    연결 해제
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && repositories.data.length > 0 && (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <label htmlFor="default-repository" className="text-sm font-medium">
            기본 발행 저장소
          </label>
          <Select
            id="default-repository"
            className="settings-select-auto"
            disabled={change.isPending}
            value={repositories.data.find((repo) => repo.isDefault)?.id ?? ""}
            onChange={(event) =>
              change.mutate({
                action: "default",
                projectRepositoryId: event.target.value || null,
              })
            }
          >
            <option value="">없음</option>
            {repositories.data.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repositoryName(repo)}
              </option>
            ))}
          </Select>
        </div>
      )}
      {change.isError && (
        <p role="alert" className="text-xs text-danger">
          {githubErrorMessage(change.error)}
        </p>
      )}
      {change.isSuccess && (
        <p role="status" className="text-xs text-muted">
          저장소 설정을 바꿨어요
        </p>
      )}
    </div>
  );
}
