"use client";

import Link from "next/link";
import { useId } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  RequesterPriorityLabel,
  requirementErrorMessage,
  requirementQueries,
  requirementStatuses,
  requirementStatusLabels,
  RequirementStatusBadge,
  type RequirementStatus,
} from "@/entities/requirement";
import { routes } from "@/shared/config";
import { formatDate } from "@/shared/lib";
import {
  Button,
  EmptyState,
  ErrorState,
  SegmentedLinks,
  Select,
  Skeleton,
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
  const id = useId();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const search = useSearchParams();
  const statusParam = search?.get("status") ?? null;
  const status = isStatus(statusParam) ? statusParam : undefined;
  const org = !projectId && isLead && search?.get("scope") === "org";
  const list = useInfiniteQuery(
    requirementQueries.list({ projectId, org, status }),
  );
  const href = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(search?.toString());
    for (const [key, value] of Object.entries(changes))
      if (value) params.set(key, value);
      else params.delete(key);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  const rows = list.data?.pages.flat() ?? [];
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex max-w-full min-w-0 items-center gap-2">
          <label
            htmlFor={`${id}-status`}
            className="shrink-0 text-sm whitespace-nowrap text-muted"
          >
            상태
          </label>
          <Select
            className="min-w-0 flex-1"
            id={`${id}-status`}
            value={status ?? ""}
            onChange={(event) =>
              router.replace(href({ status: event.target.value || null }))
            }
          >
            <option value="">전체</option>
            {requirementStatuses.map((value) => (
              <option key={value} value={value}>
                {requirementStatusLabels[value]}
              </option>
            ))}
          </Select>
        </span>
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
      {list.isPending ? (
        <div
          role="status"
          aria-label="요구사항 불러오는 중"
          className="grid gap-2"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      ) : list.isError && rows.length === 0 ? (
        <ErrorState
          description={requirementErrorMessage(list.error)}
          onRetry={() => void list.refetch()}
        />
      ) : rows.length === 0 ? (
        status || org ? (
          <EmptyState title="조건에 맞는 요구사항이 없습니다" />
        ) : (
          <EmptyState
            title="접수된 요구사항이 없습니다"
            description={
              projectId
                ? "프로젝트 설정의 접수 양식 탭에서 링크를 만들어 요청자에게 전달하세요."
                : "외부 요청자가 접수 양식으로 제출하면 여기에 쌓입니다."
            }
          />
        )
      ) : (
        <>
          <ul className="list" aria-label="요구사항 목록">
            {rows.map((row) => (
              <li key={row.id}>
                <Link href={routes.requirement(row.id)} className="list-row">
                  <span className="shrink-0 text-xs text-muted">
                    {row.projectKey ?? "조직"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {row.title}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {row.formTitle ?? "삭제된 양식"},{" "}
                      <RequesterPriorityLabel
                        priority={row.requesterPriority}
                      />
                      {row.taskCount > 0 && `, 업무 ${row.taskCount}`}
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
    </div>
  );
}
