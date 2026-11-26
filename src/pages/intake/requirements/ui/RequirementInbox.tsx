"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  RequesterPriorityLabel,
  requirementErrorMessage,
  requirementKeys,
  requirementQueries,
  requirementStatuses,
  requirementStatusLabels,
  RequirementStatusBadge,
  type RequirementStatus,
} from "@/entities/requirement";
import { routes } from "@/shared/config";
import { formatDate, keepPreviousKey } from "@/shared/lib";
import {
  Button,
  ChipSelect,
  EmptyState,
  ListSkeleton,
  QueryState,
  SegmentedLinks,
} from "@/shared/ui";

const isStatus = (value: string | null): value is RequirementStatus =>
  !!value && (requirementStatuses as readonly string[]).includes(value);

/**
 * 접수함 목록(12). 상태 필터는 URL(`?status=`), 헤드 어드민은 `?scope=org`로 조직 단위만 본다.
 * projectId 가 있으면 그 프로젝트의 요구사항 탭.
 */
export function RequirementInbox({
  projectId,
  isLead,
}: {
  readonly projectId?: string;
  readonly isLead: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const search = useSearchParams();
  const statusParam = search?.get("status") ?? null;
  const status = isStatus(statusParam) ? statusParam : undefined;
  const org = !projectId && isLead && search?.get("scope") === "org";
  const filter = { projectId, org, status };
  const list = useInfiniteQuery({
    ...requirementQueries.list(filter),
    placeholderData: keepPreviousKey(requirementKeys.list(filter)),
  });
  const href = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(search?.toString());
    for (const [key, value] of Object.entries(changes))
      if (value) params.set(key, value);
      else params.delete(key);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  return (
    <div className="grid min-w-0 gap-5">
      <div className="page-toolbar">
        <ChipSelect
          label="상태"
          value={status ?? ""}
          options={[
            { value: "", label: "모든 상태" },
            ...requirementStatuses.map((value) => ({
              value,
              label: requirementStatusLabels[value],
            })),
          ]}
          onChange={(value) => router.replace(href({ status: value || null }))}
        />
        {!projectId && isLead && (
          <SegmentedLinks
            label="범위"
            items={[
              { href: href({ scope: null }), label: "전체", active: !org },
              { href: href({ scope: "org" }), label: "조직 단위", active: org },
            ]}
          />
        )}
      </div>
      <QueryState
        query={{
          data: list.data?.pages.flat(),
          error: list.error,
          isError: list.isError,
          isPending: list.isPending,
          isFetching: list.isFetching,
          isPlaceholderData: list.isPlaceholderData,
          refetch: list.refetch,
        }}
        skeleton={
          <ListSkeleton label="요구사항 불러오는 중" rowClassName="h-14" />
        }
        errorMessage={requirementErrorMessage}
        empty={
          status || org ? (
            <EmptyState title="조건에 맞는 요구사항이 없어요" />
          ) : (
            <EmptyState
              title="접수된 요구사항이 없어요"
              description={
                projectId
                  ? "프로젝트 설정의 접수 양식 탭에서 링크를 만들어 요청자에게 전달하세요."
                  : "외부 요청자가 접수 양식으로 제출하면 여기에 쌓여요."
              }
            />
          )
        }
      >
        {(rows) => (
          <>
            <ul className="list min-w-0" aria-label="요구사항 목록">
              {rows.map((row) => (
                <li key={row.id} className="min-w-0">
                  <Link href={routes.requirement(row.id)} className="list-row">
                    <span className="shrink-0 text-xs text-muted">
                      {row.projectKey ?? "조직"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {row.title}
                      </span>
                      <span className="flex flex-wrap gap-x-2 text-xs text-muted">
                        <span
                          className="max-w-full min-w-0 truncate"
                          title={row.formTitle ?? "삭제된 양식"}
                        >
                          {row.formTitle ?? "삭제된 양식"}
                        </span>
                        <RequesterPriorityLabel
                          priority={row.requesterPriority}
                        />
                        {row.taskCount > 0 && <span>업무 {row.taskCount}</span>}
                      </span>
                    </span>
                    <RequirementStatusBadge status={row.status} />
                    <span className="shrink-0 text-sm text-muted tabular-nums">
                      {formatDate(row.submittedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {list.hasNextPage && (
              <div>
                <Button
                  variant="secondary"
                  loading={list.isFetchingNextPage}
                  onClick={() => void list.fetchNextPage()}
                >
                  더 보기
                </Button>
              </div>
            )}
          </>
        )}
      </QueryState>
    </div>
  );
}

/** 접수함 `Suspense` 자리: 필터 줄 높이와 목록 자리를 그대로 잡는다. */
export function RequirementInboxSkeleton() {
  return (
    <div className="grid min-w-0 gap-5">
      <div className="page-toolbar" />
      <ListSkeleton label="요구사항 불러오는 중" rowClassName="h-14" />
    </div>
  );
}
