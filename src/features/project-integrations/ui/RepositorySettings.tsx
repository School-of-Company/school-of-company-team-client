"use client";

import { useState } from "react";
import { githubErrorMessage } from "../model/github-error";
import { ImportStatus } from "./ImportStatus";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Select,
  Spinner,
} from "@/shared/ui";
import { repositoryName } from "@/shared/lib";
import {
  type ProjectRepository,
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
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  if (repositories.isPending || (!disabled && installable.isPending))
    return <Spinner label="저장소 불러오는 중" />;
  if (repositories.isError)
    return (
      <ErrorState
        description={githubErrorMessage(repositories.error)}
        onRetry={() => void repositories.refetch()}
      />
    );
  const available =
    installable.data?.filter(
      (repo) =>
        !repo.archived &&
        !repositories.data.some(
          (linked) => linked.repositoryId === repo.repositoryId,
        ),
    ) ?? [];
  const matches = available.filter((repo) =>
    repositoryName(repo).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        GitHub 로그인은 본인 확인에 사용하며, 저장소 접근은 별도 GitHub App
        설치가 필요합니다. 설치에서 허용한 저장소만 연결할 수 있습니다. 기본
        발행 저장소는 신규 업무의 선택 기본값이며 기존 업무를 발행하지 않습니다.
      </p>
      {repositories.data.length === 0 ? (
        <EmptyState
          title="연결된 저장소가 없습니다"
          description="GitHub App 설치에서 저장소를 허용한 뒤 연결하세요."
        />
      ) : (
        <ul className="divide-y divide-border">
          {repositories.data.map((repo) => (
            <li
              key={repo.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <div className="min-w-0">
                <p className="font-medium break-all">{repositoryName(repo)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>{repo.private ? "비공개" : "공개"}</Badge>
                  {repo.isDefault && <Badge>기본 발행</Badge>}
                </div>
                <ImportStatus
                  projectId={projectId}
                  projectKey={projectKey}
                  repository={repo}
                  disabled={disabled}
                />
              </div>
              {!disabled && editing && (
                <Button
                  variant="ghost"
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
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-muted">
        기본 발행 저장소: {defaultName(repositories.data)}
      </p>
      {!disabled && !editing && (
        <Button
          variant="secondary"
          className="justify-self-start"
          onClick={() => {
            change.reset();
            setEditing(true);
          }}
        >
          저장소 편집
        </Button>
      )}
      {!disabled && installable.isError && (
        <ErrorState
          description={githubErrorMessage(installable.error)}
          onRetry={() => void installable.refetch()}
        />
      )}
      {editing && (
        <Field id="default-repository" label="기본 발행 저장소">
          <Select
            id="default-repository"
            disabled={disabled || change.isPending}
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
        </Field>
      )}
      {!disabled && editing && !installable.isError && (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (change.isPending) return;
            const repoId = String(
              new FormData(event.currentTarget).get("repository") ?? "",
            );
            const repo = available.find(
              (item) => String(item.repositoryId) === repoId,
            );
            if (repo)
              change.mutate(
                {
                  action: "link",
                  installationId: repo.installationId,
                  repositoryId: repo.repositoryId,
                },
                { onSuccess: () => setSelectedId("") },
              );
          }}
        >
          <Field id="repository-search" label="허용된 저장소 검색">
            <Input
              id="repository-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <Field id="installable-repository" label="연결할 저장소">
            <Select
              id="installable-repository"
              name="repository"
              required
              disabled={change.isPending || available.length === 0}
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              <option value="" disabled>
                저장소 선택
              </option>
              {matches.map((repo) => (
                <option key={repo.repositoryId} value={repo.repositoryId}>
                  {repositoryName(repo)}
                  {repo.private ? " (비공개)" : " (공개)"}
                </option>
              ))}
            </Select>
          </Field>
          {available.find((repo) => String(repo.repositoryId) === selectedId)
            ?.private && (
            <p className="text-sm text-muted">
              연결하면 열린 Issue를 업무로 가져옵니다. 비공개 저장소의 업무는
              원본 저장소 권한이 있는 참여자에게만 보여요.
            </p>
          )}
          {available.length === 0 && (
            <p className="text-sm text-muted">
              새로 연결할 수 있는 저장소가 없습니다. 설치에 허용된 저장소와 보관
              여부를 확인하세요.
            </p>
          )}
          {available.length > 0 && matches.length === 0 && (
            <p className="text-sm text-muted">
              검색 결과가 없습니다. 검색어를 바꿔보세요.
            </p>
          )}
          <Button
            type="submit"
            variant="secondary"
            disabled={available.length === 0}
            loading={change.isPending}
          >
            저장소 연결
          </Button>
        </form>
      )}
      {editing && (
        <Button
          variant="ghost"
          className="justify-self-start"
          disabled={change.isPending}
          onClick={() => setEditing(false)}
        >
          편집 마침
        </Button>
      )}
      {change.isError && (
        <p role="alert" className="text-sm text-danger">
          {githubErrorMessage(change.error)}
        </p>
      )}
      {change.isSuccess && (
        <p role="status" className="text-sm">
          저장소 설정을 변경했습니다.
        </p>
      )}
    </div>
  );
}

const defaultName = (repositories: readonly ProjectRepository[]) => {
  const found = repositories.find((repo) => repo.isDefault);
  return found ? repositoryName(found) : "없음";
};
