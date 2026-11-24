"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  serviceErrorMessage,
  serviceQueries,
  StaleNotice,
  type ReleaseDetail,
  type ReleaseSummary,
  type ServiceDetail,
} from "@/entities/service";
import { statusLabels } from "@/entities/task";
import { routes } from "@/shared/config";
import {
  Badge,
  Dialog,
  EmptyState,
  ErrorState,
  Skeleton,
  ListSkeleton,
} from "@/shared/ui";
import { formatDateTime } from "./format";

const itemsLabel = (release: ReleaseSummary) => {
  switch (release.itemsStatus) {
    case "READY":
      return `PR ${release.itemCount}개`;
    case "TRUNCATED":
      return `PR ${release.itemCount}개 이상`;
    case "PENDING":
      return "PR 계산 중";
    case "NO_BASE":
      return "첫 릴리스";
    case "FAILED":
      return "PR 목록 없음";
  }
};

/** 비공개 저장소가 숨겨졌으면 목록 아래에 알린다(숨긴 항목은 개수에서도 빠진다). */
export function HiddenRepositoriesNote({
  service,
  what,
}: {
  readonly service: ServiceDetail;
  readonly what: string;
}) {
  const hidden = service.repositories.filter((repo) => !repo.accessible).length;
  if (hidden === 0) return null;
  return (
    <p className="text-xs text-muted">
      GitHub 원본 권한이 없는 비공개 저장소 {hidden}개의 {what}은 보이지
      않습니다.
    </p>
  );
}

export function ReleasesState({
  service,
  query,
  compact = false,
  children,
}: {
  readonly service: ServiceDetail;
  readonly query: UseQueryResult<readonly ReleaseSummary[]>;
  readonly compact?: boolean;
  readonly children: (items: readonly ReleaseSummary[]) => ReactNode;
}) {
  // 탭 본문은 빈 상태와 같은 높이에서 시작한다. 개요의 작은 칸만 짧은 줄 두 개.
  if (query.isPending && !compact)
    return (
      <ListSkeleton label="릴리스를 불러오는 중" rows={2} rowClassName="h-10" />
    );
  if (query.isPending)
    return (
      <div
        role="status"
        aria-label="릴리스를 불러오는 중"
        className="grid gap-2"
      >
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  if (!query.data)
    return (
      <ErrorState
        description={serviceErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  const visible = service.repositories.some((repo) => repo.accessible);
  return (
    <>
      <StaleNotice query={query} />
      {query.data.length === 0 ? (
        compact ? (
          <p className="text-sm text-muted">
            {service.repositories.length === 0
              ? "저장소를 연결하면 릴리스가 쌓입니다."
              : visible
                ? "수집된 릴리스가 없습니다."
                : "볼 수 있는 릴리스가 없습니다."}
          </p>
        ) : (
          <EmptyState
            title={
              visible || service.repositories.length === 0
                ? "수집된 릴리스가 없습니다"
                : "볼 수 있는 릴리스가 없습니다"
            }
            description={
              service.repositories.length === 0
                ? "이 서비스에 저장소를 연결하면 GitHub 릴리스가 여기에 쌓입니다."
                : visible
                  ? "연결한 저장소에 릴리스를 게시하면 여기에 쌓입니다. GitHub App이 release 이벤트를 구독하기 전에는 수집 대기 상태입니다."
                  : "이 서비스의 저장소는 모두 비공개입니다. GitHub 원본 권한이 있어야 릴리스가 보입니다."
            }
          />
        )
      ) : (
        children(query.data)
      )}
      <HiddenRepositoriesNote service={service} what="릴리스" />
    </>
  );
}

export function ReleaseRow({ release }: { readonly release: ReleaseSummary }) {
  return (
    <li className="service-list-row">
      <Link
        href={`?tab=releases&release=${encodeURIComponent(release.id)}`}
        className="min-w-0 grow"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium break-all">{release.tag}</span>
          {release.name && release.name !== release.tag && (
            <span className="text-sm break-words text-foreground-2">
              {release.name}
            </span>
          )}
          {release.prerelease && <Badge>프리릴리스</Badge>}
        </span>
        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span className="break-all">{release.repositoryFullName}</span>
          <time dateTime={release.publishedAt}>
            {formatDateTime(release.publishedAt)}
          </time>
          <span className="tabular-nums" data-items={release.itemsStatus}>
            {itemsLabel(release)}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function ServiceReleases({
  service,
}: {
  readonly service: ServiceDetail;
}) {
  const releases = useQuery(serviceQueries.releases(service.id));
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname() ?? routes.service(service.key);
  const selected = search?.get("release");
  return (
    <section aria-label="릴리스" className="grid gap-3">
      <p className="text-sm text-muted">
        직전 릴리스 이후 merge된 PR과 그 PR에 연결된 업무를 보여 줍니다. 업무
        상태는 바꾸지 않습니다.
      </p>
      <ReleasesState service={service} query={releases}>
        {(items) => (
          <ul className="service-list">
            {items.map((release) => (
              <ReleaseRow key={release.id} release={release} />
            ))}
          </ul>
        )}
      </ReleasesState>
      {selected && (
        <ReleaseNote
          releaseId={selected}
          onClose={() =>
            router.replace(`${pathname}?tab=releases`, { scroll: false })
          }
        />
      )}
    </section>
  );
}

function ItemsNotice({ release }: { readonly release: ReleaseDetail }) {
  const text = {
    READY: null,
    PENDING: "PR 목록을 계산하고 있습니다. 잠시 후 자동으로 다시 불러옵니다.",
    TRUNCATED:
      "범위가 커서 일부 PR만 표시합니다. 전체는 GitHub에서 확인하세요.",
    NO_BASE: "첫 릴리스라 비교할 이전 릴리스가 없어 PR 목록이 없습니다.",
    FAILED:
      "GitHub에서 PR 목록을 가져오지 못했습니다. GitHub 릴리스 페이지에서 확인하세요.",
  }[release.itemsStatus];
  return text ? (
    <p role="status" className="service-notice text-sm">
      {text}
    </p>
  ) : null;
}

function ReleaseNote({
  releaseId,
  onClose,
}: {
  readonly releaseId: string;
  readonly onClose: () => void;
}) {
  const release = useQuery(serviceQueries.release(releaseId));
  const data = release.data;
  return (
    <Dialog
      open
      onClose={onClose}
      title={data ? `릴리스 ${data.tag}` : "릴리스"}
      className="service-dialog release-dialog"
    >
      {release.isPending ? (
        <div
          role="status"
          aria-label="릴리스 노트를 불러오는 중"
          className="grid gap-2"
        >
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24" />
        </div>
      ) : release.isError ? (
        <ErrorState
          title="릴리스를 볼 수 없습니다"
          description={serviceErrorMessage(release.error)}
        />
      ) : data ? (
        <div className="grid gap-4">
          <dl className="release-meta">
            <div>
              <dt>저장소</dt>
              <dd className="break-all">{data.repositoryFullName}</dd>
            </div>
            <div>
              <dt>게시</dt>
              <dd>{formatDateTime(data.publishedAt)}</dd>
            </div>
            <div>
              <dt>비교 기준</dt>
              <dd>
                {data.baseTag ??
                  (data.itemsStatus === "PENDING" ? "계산 전" : "없음")}
              </dd>
            </div>
          </dl>
          {data.name && data.name !== data.tag && (
            <p className="font-medium">{data.name}</p>
          )}
          <ItemsNotice release={data} />
          {data.items.length > 0 && (
            <ol className="release-items">
              {data.items.map((item) => (
                <li key={item.number}>
                  <a href={item.url} className="font-medium hover:underline">
                    <span className="text-muted tabular-nums">
                      #{item.number}
                    </span>{" "}
                    {item.title}
                  </a>
                  {item.mergedAt && (
                    <p className="text-xs text-muted">
                      merge {formatDateTime(item.mergedAt)}
                    </p>
                  )}
                  {item.tasks.length === 0 ? (
                    <p className="text-xs text-muted">연결된 업무 없음</p>
                  ) : (
                    <ul className="release-tasks">
                      {item.tasks.map((task) => (
                        <li key={task.id}>
                          <span
                            className="status-icon"
                            data-status={task.status}
                            aria-hidden="true"
                          />
                          <Link
                            href={routes.task(task.id)}
                            className="min-w-0 hover:underline"
                          >
                            <span className="text-muted">
                              {task.key ?? "개인"}
                            </span>{" "}
                            {task.title}
                          </Link>
                          <span className="text-xs text-muted">
                            {statusLabels[task.status]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
          {data.items.length > 0 && (
            <p className="text-xs text-muted">
              내가 볼 수 있는 업무만 표시합니다. 개인 업무와 원본 권한이 없는
              비공개 업무는 빠집니다.
            </p>
          )}
          <a
            href={data.url}
            className="ui-button ui-button-secondary ui-button-sm justify-self-start"
          >
            GitHub에서 보기
          </a>
        </div>
      ) : null}
    </Dialog>
  );
}
