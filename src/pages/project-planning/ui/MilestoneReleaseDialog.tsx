import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  milestoneErrorMessage,
  milestoneInput,
  validateMilestone,
  type Milestone,
  type MilestoneInput,
} from "@/entities/milestone";
import { serviceQueries } from "@/entities/service";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import { Button, Dialog, Field, Input, Select } from "@/shared/ui";

/** 대화상자 안에서는 한 번만 받는다(서비스 화면의 10초 폴링을 끈다). */
const once = { refetchInterval: false } as const;

/**
 * 서비스에 연결된 저장소 하나와 태그(계약 D15-f). 릴리스는 서비스에 연결된 저장소에서만 모이므로 그 밖의 저장소는 고를 수 없다.
 * 태그 칸에는 이미 게시된 릴리스 태그를 제안하지만, 아직 없는 태그도 적을 수 있다.
 */
export function MilestoneReleaseDialog({
  milestone,
  onClose,
  onSubmit,
}: {
  readonly milestone: Milestone;
  readonly onClose: () => void;
  readonly onSubmit: (input: MilestoneInput) => Promise<unknown>;
}) {
  const id = useId();
  const previous = milestoneInput(milestone);
  const [repositoryId, setRepositoryId] = useState(
    previous.releaseRepositoryId,
  );
  const [tag, setTag] = useState(previous.releaseTag);
  const [error, setError] = useState<string | null>(null);
  const [repositoryError, setRepositoryError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const services = useQuery({ ...serviceQueries.list(false), ...once });
  const linked = (services.data ?? []).filter(
    (service) => service.repositoryCount > 0,
  );
  const details = useQueries({
    queries: linked.map((service) => ({
      ...serviceQueries.detail(service.id),
      ...once,
    })),
  });
  const repositories = [
    ...new Map(
      details
        .flatMap((detail) =>
          (detail.data?.repositories ?? []).map((repository) => ({
            ...repository,
            serviceId: detail.data!.id,
          })),
        )
        .filter((repository) => repository.accessible && repository.fullName)
        .map((repository) => [repository.repositoryId, repository]),
    ).values(),
  ].sort((left, right) => left.fullName!.localeCompare(right.fullName!));
  const loading =
    services.isPending || details.some((detail) => detail.isPending);
  const chosen = repositories.find(
    (repository) => String(repository.repositoryId) === repositoryId,
  );
  const releases = useQuery({
    ...serviceQueries.releases(chosen?.serviceId ?? ""),
    ...once,
    enabled: !!chosen,
  });
  const tags = (releases.data ?? [])
    .filter((release) => release.repositoryId === chosen?.repositoryId)
    .map((release) => release.tag);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const input = {
      ...previous,
      releaseRepositoryId: repositoryId,
      releaseTag: repositoryId ? tag : "",
    };
    const problem = validateMilestone(input).releaseTag;
    setError(problem ?? null);
    setRepositoryError(null);
    if (problem) return;
    setPending(true);
    try {
      await onSubmit(input);
      onClose();
    } catch (cause) {
      const failure = normalizeApiError(cause);
      // 저장소 문제는 저장소 칸에, 나머지(태그 검증 등)는 태그 칸 또는 양식 아래에.
      if (failure.code === "MILESTONE_RELEASE_REPOSITORY_NOT_LINKED")
        setRepositoryError(milestoneErrorMessage(failure));
      else setError(milestoneErrorMessage(failure));
    } finally {
      setPending(false);
    }
  }
  const empty = !loading && !services.isError && repositories.length === 0;
  return (
    <Dialog
      open
      onClose={() => {
        if (!pending) onClose();
      }}
      title="릴리스 연결"
      className="milestone-panel"
    >
      <form onSubmit={submit} className="grid gap-5" noValidate>
        <p className="text-sm text-muted">
          이 저장소에 태그의 릴리스가 게시되면 마일스톤이 자동으로 완료돼요.
        </p>
        <Field
          id={`${id}-repository`}
          label="저장소"
          error={repositoryError ?? undefined}
          hint={
            services.isError
              ? "서비스 목록을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요."
              : empty
                ? "서비스에 연결된 저장소가 없어요. 릴리스는 서비스에 연결된 저장소에서만 모으기 때문에, 먼저 서비스 화면에서 저장소를 연결해 주세요."
                : "서비스에 연결된 저장소만 고를 수 있어요."
          }
        >
          <Select
            id={`${id}-repository`}
            value={repositoryId}
            onChange={(event) => setRepositoryId(event.target.value)}
            aria-invalid={repositoryError ? true : undefined}
            aria-describedby={
              repositoryError
                ? `${id}-repository-error ${id}-repository-hint`
                : `${id}-repository-hint`
            }
            aria-busy={loading || undefined}
          >
            <option value="">연결 안 함</option>
            {/* 지금 연결이 목록 밖이면(서비스에서 빠짐) 그대로 보여 준다. */}
            {milestone.releaseLink &&
              !repositories.some(
                (repository) =>
                  repository.repositoryId ===
                  milestone.releaseLink?.repositoryId,
              ) && (
                <option value={String(milestone.releaseLink.repositoryId)}>
                  {milestone.releaseLink.repositoryFullName}
                </option>
              )}
            {repositories.map((repository) => (
              <option
                key={repository.repositoryId}
                value={String(repository.repositoryId)}
              >
                {repository.fullName}
              </option>
            ))}
          </Select>
        </Field>
        {empty && (
          <Link
            href={routes.services}
            className="ui-button ui-button-secondary ui-button-sm justify-self-start"
          >
            서비스 화면으로 가기
          </Link>
        )}
        {repositoryId && (
          <Field
            id={`${id}-tag`}
            label="태그"
            error={error ?? undefined}
            hint="예: v1.0.0. 아직 게시되지 않은 태그도 적을 수 있어요."
          >
            <Input
              id={`${id}-tag`}
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              list={`${id}-tags`}
              maxLength={255}
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-tag-error` : `${id}-tag-hint`}
            />
            <datalist id={`${id}-tags`}>
              {tags.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          </Field>
        )}
        {error && !repositoryId && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            취소
          </Button>
          <Button type="submit" loading={pending}>
            저장
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
