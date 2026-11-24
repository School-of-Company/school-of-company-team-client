"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AuthGuard } from "@/features/auth";
import { searchQueries } from "../api/search";
import {
  availableTypes,
  itemHref,
  SEARCH_MAX_LENGTH,
  searchErrorMessage,
  searchTypeLabels,
  searchTypes,
  visibleGroups,
  type SupportedSearchType,
} from "../model/search";
import { SearchItemLine, useDebounced } from "./SearchPalette";
import { normalizeApiError } from "@/shared/api";
import {
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageHeader,
  PageSkeleton,
  SegmentedLinks,
} from "@/shared/ui";

/** 팔레트의 "전체 결과 보기" 목적지. type 별 최대 20건. 상태는 URL(`?q=`, `?type=`)에 둔다. */
export function SearchPage() {
  return (
    <AuthGuard
      require="work"
      fallback={<PageSkeleton label="계정 상태 확인 중" subtitle={false} />}
    >
      {() => (
        <Suspense
          fallback={<PageSkeleton label="검색 준비 중" subtitle={false} />}
        >
          <SearchContent />
        </Suspense>
      )}
    </AuthGuard>
  );
}

function SearchContent() {
  const router = useRouter();
  const pathname = usePathname() ?? "/search";
  const params = useSearchParams();
  const q = (params?.get("q") ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
  const rawType = params?.get("type");
  const type = searchTypes.find((value) => value === rawType);
  const [input, setInput] = useState(q);
  // 다른 곳(팔레트의 "전체 결과 보기", 뒤로 가기)에서 주소가 바뀌면 입력도 맞춘다.
  const [seenQ, setSeenQ] = useState(q);
  if (q !== seenQ) {
    setSeenQ(q);
    if (q !== input.trim()) setInput(q);
  }
  const term = useDebounced(input.trim());
  const search = useQuery(searchQueries.search(q, 20));
  const href = (next: { q?: string; type?: SupportedSearchType | null }) => {
    const query = new URLSearchParams(params?.toString());
    const nextQ = next.q ?? q;
    if (nextQ) query.set("q", nextQ);
    else query.delete("q");
    const nextType = next.type === undefined ? type : next.type;
    if (nextType) query.set("type", nextType);
    else query.delete("type");
    const text = query.toString();
    return text ? `${pathname}?${text}` : pathname;
  };
  // 입력이 멈추면 주소를 바꾼다(뒤로 가기 기록을 늘리지 않는다).
  useEffect(() => {
    if (term !== q) router.replace(href({ q: term }), { scroll: false });
    // href 는 매번 새로 만들어지는 함수라 의존성에서 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);
  const groups = visibleGroups(search.data, type);
  const types = availableTypes(search.data);
  return (
    <div className="search-page grid gap-5">
      <PageHeader title="검색" subtitle={false} />
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          router.replace(href({ q: input.trim() }), { scroll: false });
        }}
      >
        <input
          type="search"
          aria-label="검색어"
          className="ui-input search-input"
          placeholder="업무 키, 제목, 문서, 장애, 서비스, 스프린트"
          maxLength={SEARCH_MAX_LENGTH}
          autoComplete="off"
          spellCheck={false}
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
      </form>
      {/* 결과 유형 줄은 검색어가 있으면 결과 전에도 높이를 잡아 둔다. */}
      {q && (
        <div className="page-toolbar">
          {search.data && (
            <SegmentedLinks
              label="결과 유형"
              items={[
                { href: href({ type: null }), label: "전체", active: !type },
                ...types.map((value) => ({
                  href: href({ type: value }),
                  label: searchTypeLabels[value],
                  active: type === value,
                })),
              ]}
            />
          )}
        </div>
      )}
      {!q ? (
        <EmptyState
          title="검색어를 입력하세요"
          description="업무 키(HUB-142)나 제목, 문서, 장애 제목, 서비스 이름, 스프린트 이름으로 찾습니다. 어디서든 ⌘K 또는 Ctrl+K로 열 수 있습니다."
        />
      ) : search.isPending ? (
        <ListSkeleton label="검색하는 중" rowClassName="h-10" />
      ) : search.isError && !search.data ? (
        <ErrorState
          title="검색하지 못했습니다"
          description={searchErrorMessage(normalizeApiError(search.error))}
          onRetry={() => void search.refetch()}
        />
      ) : groups.length === 0 ? (
        <EmptyState
          title="일치하는 결과가 없습니다"
          description={`‘${search.data.query}’ ${type ? `${searchTypeLabels[type]} ` : ""}검색 결과가 없습니다. 다른 검색어를 입력해 보세요.`}
        />
      ) : (
        <div
          className="grid gap-6"
          aria-busy={search.isPlaceholderData || undefined}
        >
          {groups.map((group) => (
            <section
              key={group.type}
              className="grid gap-2"
              aria-labelledby={`search-${group.type}`}
            >
              <h2 id={`search-${group.type}`} className="text-sm font-semibold">
                {searchTypeLabels[group.type]}{" "}
                <span className="font-normal text-muted tabular-nums">
                  {group.items.length}
                  {group.hasMore ? "건 이상" : "건"}
                </span>
              </h2>
              <ul className="search-list">
                {group.items.map((item) => {
                  const target = itemHref(item);
                  return (
                    <li key={item.id}>
                      {target ? (
                        <Link href={target} className="search-option">
                          <SearchItemLine item={item} />
                        </Link>
                      ) : (
                        <span className="search-option">
                          <SearchItemLine item={item} />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {group.hasMore && (
                <p className="text-xs text-muted">
                  상위 {group.items.length}건만 보여 줍니다. 검색어를 더 자세히
                  입력하세요.
                </p>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
