"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  serviceApi,
  serviceErrorMessage,
  serviceQueries,
  type ServiceDetail,
  type ServiceRepository,
} from "@/entities/service";
import {
  Button,
  Dialog,
  EmptyState,
  Field,
  Input,
  Select,
  Spinner,
} from "@/shared/ui";
import { useServiceMutation } from "../api/mutations";
import { validateEnvironment } from "../model/validation";
import { ConfirmDialog } from "./ConfirmDialog";

/**
 * 비공개 저장소이고 조회자에게 원본 권한이 없으면 이름 없이 "비공개 저장소"로만 보인다(D6-8).
 * 저장소 하나는 서비스 하나에만 연결된다(D6-3).
 */
export function ServiceRepositories({
  service,
}: {
  readonly service: ServiceDetail;
}) {
  const [linking, setLinking] = useState(false);
  const [settings, setSettings] = useState<ServiceRepository | null>(null);
  const [unlinking, setUnlinking] = useState<ServiceRepository | null>(null);
  const unlink = useServiceMutation(service.id, (repositoryId: number) =>
    serviceApi.unlinkRepository(service.id, repositoryId),
  );
  const hidden = service.repositories.filter((repo) => !repo.accessible).length;
  return (
    <section aria-labelledby="service-repositories" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="service-repositories">저장소</h2>
        {service.canEdit && (
          <Button
            variant="secondary"
            className="ui-button-sm"
            onClick={() => setLinking(true)}
          >
            저장소 연결
          </Button>
        )}
      </div>
      {service.repositories.length === 0 ? (
        <EmptyState
          title="연결된 저장소가 없습니다"
          description={
            service.canEdit
              ? "GitHub App 설치에서 허용한 저장소를 연결하면 릴리스와 배포가 쌓입니다."
              : "소유자가 저장소를 연결하면 릴리스와 배포가 여기에 쌓입니다."
          }
        />
      ) : (
        <ul className="service-list">
          {service.repositories.map((repo) => (
            <li key={repo.repositoryId} className="service-list-row">
              <div className="min-w-0">
                {repo.accessible && repo.fullName ? (
                  <a
                    href={repo.url ?? undefined}
                    className="font-medium break-all hover:underline"
                  >
                    {repo.fullName}
                  </a>
                ) : (
                  <span className="font-medium text-foreground-2">
                    비공개 저장소
                  </span>
                )}
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  <span>{repo.private ? "비공개" : "공개"}</span>
                  <span>환경 {repo.deployEnvironment}</span>
                  {repo.accessible && (
                    <span>
                      {repo.deployWorkflowName
                        ? `배포 워크플로 ${repo.deployWorkflowName}`
                        : "배포 워크플로 없음"}
                    </span>
                  )}
                </p>
              </div>
              {service.canEdit && (
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="ghost"
                    className="ui-button-sm"
                    disabled={!repo.accessible}
                    onClick={() => setSettings(repo)}
                    aria-label={`${repo.fullName ?? "비공개 저장소"} 배포 설정`}
                  >
                    배포 설정
                  </Button>
                  <Button
                    variant="ghost"
                    className="ui-button-sm"
                    onClick={() => {
                      unlink.reset();
                      setUnlinking(repo);
                    }}
                    aria-label={`${repo.fullName ?? "비공개 저장소"} 연결 해제`}
                  >
                    연결 해제
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 && (
        <p className="text-xs text-muted">
          비공개 저장소 {hidden}개는 GitHub 원본 권한이 있는 사람에게만 이름,
          릴리스, 배포가 보입니다.
        </p>
      )}
      {linking && (
        <LinkRepositoryDialog
          service={service}
          onClose={() => setLinking(false)}
        />
      )}
      {settings && (
        <RepositorySettingsDialog
          service={service}
          repository={settings}
          onClose={() => setSettings(null)}
        />
      )}
      <ConfirmDialog
        open={unlinking !== null}
        title="저장소 연결 해제"
        description={`이 서비스에서 ${unlinking?.fullName ?? "비공개 저장소"} 연결을 해제합니다. 쌓인 릴리스, 배포 기록은 지우지 않고, 다시 연결하면 보입니다.`}
        confirmLabel="연결 해제"
        pending={unlink.isPending}
        error={unlink.error ? serviceErrorMessage(unlink.error) : undefined}
        onClose={() => !unlink.isPending && setUnlinking(null)}
        onConfirm={() =>
          unlinking &&
          unlink.mutate(unlinking.repositoryId, {
            onSuccess: () => setUnlinking(null),
          })
        }
      />
    </section>
  );
}

function LinkRepositoryDialog({
  service,
  onClose,
}: {
  readonly service: ServiceDetail;
  readonly onClose: () => void;
}) {
  const installable = useQuery(serviceQueries.installable(service.id));
  const [selected, setSelected] = useState("");
  const link = useServiceMutation(
    service.id,
    (repo: { installationId: number; repositoryId: number }) =>
      serviceApi.linkRepository(service.id, repo),
  );
  const available =
    installable.data?.filter(
      (repo) =>
        !repo.archived &&
        !service.repositories.some(
          (linked) => linked.repositoryId === repo.repositoryId,
        ),
    ) ?? [];
  const close = () => !link.isPending && onClose();
  return (
    <Dialog open onClose={close} title="저장소 연결" className="service-dialog">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const repo = available.find(
            (item) => String(item.repositoryId) === selected,
          );
          if (repo && !link.isPending)
            link.mutate(
              {
                installationId: repo.installationId,
                repositoryId: repo.repositoryId,
              },
              { onSuccess: onClose },
            );
        }}
      >
        <p className="text-sm text-muted">
          저장소 하나는 서비스 하나에만 연결돼요.
        </p>
        {installable.isPending ? (
          <Spinner label="저장소 불러오는 중" />
        ) : installable.isError ? (
          <div role="alert" className="grid gap-2 text-sm">
            <p className="text-danger">
              {serviceErrorMessage(installable.error)}
            </p>
            <Button
              variant="secondary"
              className="justify-self-start"
              onClick={() => void installable.refetch()}
            >
              다시 시도
            </Button>
          </div>
        ) : available.length === 0 ? (
          <p className="text-sm text-muted">
            새로 연결할 수 있는 저장소가 없습니다. 설치에 허용된 저장소와 보관
            여부를 확인하세요.
          </p>
        ) : (
          <Field id="link-repository" label="저장소">
            <Select
              id="link-repository"
              required
              value={selected}
              disabled={link.isPending}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="" disabled>
                저장소 선택
              </option>
              {available.map((repo) => (
                <option key={repo.repositoryId} value={repo.repositoryId}>
                  {repo.fullName}
                  {repo.private ? " (비공개)" : ""}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {link.error ? (
          <p role="alert" className="text-sm text-danger">
            {serviceErrorMessage(link.error)}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={link.isPending} onClick={close}>
            취소
          </Button>
          <Button type="submit" disabled={!selected} loading={link.isPending}>
            연결
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function RepositorySettingsDialog({
  service,
  repository,
  onClose,
}: {
  readonly service: ServiceDetail;
  readonly repository: ServiceRepository;
  readonly onClose: () => void;
}) {
  const [workflow, setWorkflow] = useState(repository.deployWorkflowName ?? "");
  const [environment, setEnvironment] = useState(repository.deployEnvironment);
  const [error, setError] = useState<string>();
  const update = useServiceMutation(
    service.id,
    (body: { deployWorkflowName: string; deployEnvironment: string }) =>
      serviceApi.updateRepository(service.id, repository.repositoryId, body),
  );
  const close = () => !update.isPending && onClose();
  return (
    <Dialog open onClose={close} title="배포 설정" className="service-dialog">
      <form
        noValidate
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (update.isPending) return;
          const problem = validateEnvironment(environment);
          setError(problem);
          if (!problem)
            update.mutate(
              {
                deployWorkflowName: workflow.trim(),
                deployEnvironment: environment.trim(),
              },
              { onSuccess: onClose },
            );
        }}
      >
        <p className="text-sm font-medium break-all">{repository.fullName}</p>
        <Field
          id="deploy-workflow"
          label="배포 워크플로 이름"
          hint="GitHub Actions 워크플로 이름과 똑같이 적어야 배포로 기록돼요. 비우면 deployment 이벤트만 받아요."
        >
          <Input
            id="deploy-workflow"
            autoComplete="off"
            maxLength={100}
            placeholder="예: CD"
            value={workflow}
            disabled={update.isPending}
            aria-describedby="deploy-workflow-hint"
            onChange={(event) => setWorkflow(event.target.value)}
          />
        </Field>
        <Field id="deploy-environment" label="환경" error={error}>
          <Input
            id="deploy-environment"
            required
            maxLength={100}
            value={environment}
            disabled={update.isPending}
            aria-invalid={error ? true : undefined}
            onChange={(event) => setEnvironment(event.target.value)}
          />
        </Field>
        {update.error ? (
          <p role="alert" className="text-sm text-danger">
            {serviceErrorMessage(update.error)}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            disabled={update.isPending}
            onClick={close}
          >
            취소
          </Button>
          <Button type="submit" loading={update.isPending}>
            저장
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
