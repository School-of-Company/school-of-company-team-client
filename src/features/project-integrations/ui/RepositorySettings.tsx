"use client";

import { normalizeApiError } from "@/shared/api";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Select,
  Spinner,
} from "@/shared/ui";
import {
  useInstallableRepositories,
  useProjectRepositories,
  useRepositoryChange,
} from "../api/integrations";

export function RepositorySettings({
  projectId,
  disabled,
}: {
  readonly projectId: string;
  readonly disabled: boolean;
}) {
  const repositories = useProjectRepositories(projectId, true);
  const installable = useInstallableRepositories(projectId, !disabled);
  const change = useRepositoryChange(projectId);
  if (repositories.isPending || (!disabled && installable.isPending))
    return <Spinner label="저장소 불러오는 중" />;
  if (repositories.isError)
    return (
      <ErrorState
        description={normalizeApiError(repositories.error).message}
        onRetry={() => void repositories.refetch()}
      />
    );
  if (!disabled && installable.isError)
    return (
      <ErrorState
        description={normalizeApiError(installable.error).message}
        onRetry={() => void installable.refetch()}
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
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        GitHub App 설치에서 허용한 저장소만 연결할 수 있습니다. 기본 발행
        저장소는 신규 업무의 선택 기본값이며 기존 업무를 발행하지 않습니다.
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
                <p className="font-medium break-all">{repo.fullName}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>{repo.private ? "비공개" : "공개"}</Badge>
                  {!repo.publishable && <Badge>링크 연결만 가능</Badge>}
                  {repo.isDefault && <Badge>기본 발행</Badge>}
                </div>
              </div>
              {!disabled && (
                <Button
                  variant="ghost"
                  disabled={change.isPending}
                  onClick={() =>
                    change.mutate({
                      action: "unlink",
                      projectRepositoryId: repo.id,
                    })
                  }
                  aria-label={`${repo.fullName} 연결 해제`}
                >
                  연결 해제
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
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
          {repositories.data
            .filter((repo) => repo.publishable)
            .map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.fullName}
              </option>
            ))}
        </Select>
      </Field>
      {!disabled && (
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
              change.mutate({
                action: "link",
                installationId: repo.installationId,
                repositoryId: repo.repositoryId,
              });
          }}
        >
          <Field id="installable-repository" label="연결할 저장소">
            <Select
              id="installable-repository"
              name="repository"
              required
              disabled={change.isPending || available.length === 0}
              defaultValue=""
            >
              <option value="" disabled>
                저장소 선택
              </option>
              {available.map((repo) => (
                <option key={repo.repositoryId} value={repo.repositoryId}>
                  {repo.fullName}
                  {repo.private ? " (비공개)" : " (공개)"}
                </option>
              ))}
            </Select>
          </Field>
          {available.length === 0 && (
            <p className="text-sm text-muted">
              새로 연결할 수 있는 저장소가 없습니다. 설치에 허용된 저장소와 보관
              여부를 확인하세요.
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
      {change.isError && (
        <p role="alert" className="text-sm text-danger">
          {normalizeApiError(change.error).message}
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
