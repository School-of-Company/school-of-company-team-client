"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { normalizeApiError } from "@/shared/api";
import { Button, Dialog, Spinner } from "@/shared/ui";
import { searchQueries } from "../api/search";
import {
  itemHref,
  itemMeta,
  moveActive,
  searchErrorMessage,
  searchTypeLabels,
  SEARCH_MAX_LENGTH,
  visibleGroups,
} from "../model/search";

/** 입력이 멈추고 이만큼 지나면 검색한다. */
export const SEARCH_DEBOUNCE_MS = 200;

export function useDebounced(value: string, delay = SEARCH_DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** ⌘K 명령 팔레트. 열 때마다 빈 입력으로 시작한다. */
export function SearchPalette({
  open,
  onClose,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="검색"
      className="search-dialog"
    >
      {open && <PaletteBody onClose={onClose} />}
    </Dialog>
  );
}

function PaletteBody({ onClose }: { readonly onClose: () => void }) {
  const router = useRouter();
  const id = useId();
  const [input, setInput] = useState("");
  const [active, setActive] = useState(0);
  const term = useDebounced(input.trim());
  const search = useQuery(searchQueries.search(term));
  const groups = term ? visibleGroups(search.data) : [];
  const items = groups.flatMap((group) => group.items);
  const current = items.length ? Math.min(active, items.length - 1) : -1;
  const waiting = input.trim() !== term || (search.isFetching && !!term);
  const open = (index: number) => {
    const item = items[index];
    const href = item && itemHref(item);
    if (!href) return;
    onClose();
    router.push(href);
  };
  // 묶음마다 첫 항목의 전체 순번(키보드 이동은 묶음을 건너 이어진다).
  const starts = groups.map((_, g) =>
    groups.slice(0, g).reduce((sum, group) => sum + group.items.length, 0),
  );
  return (
    <div className="grid gap-3">
      <div className="search-field">
        <input
          type="search"
          role="combobox"
          aria-label="검색어"
          aria-expanded={items.length > 0}
          aria-controls={`${id}-results`}
          aria-autocomplete="list"
          aria-activedescendant={
            current >= 0 ? `${id}-option-${current}` : undefined
          }
          className="ui-input search-input"
          placeholder="업무 키, 제목, 문서, 장애, 서비스, 스프린트"
          maxLength={SEARCH_MAX_LENGTH}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setActive(
                moveActive(
                  current,
                  event.key === "ArrowDown" ? 1 : -1,
                  items.length,
                ),
              );
            } else if (event.key === "Enter" && current >= 0) {
              event.preventDefault();
              open(current);
            }
          }}
        />
        {waiting && (
          <span className="ui-spinner search-spinner" aria-hidden="true" />
        )}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {term && search.data && !search.isPlaceholderData
          ? items.length
            ? `결과 ${items.length}건`
            : "결과 없음"
          : ""}
      </p>
      {!term ? (
        <p className="search-hint">
          검색어를 입력하세요. 위아래 화살표로 고르고 Enter로 엽니다.
        </p>
      ) : search.isPending ? (
        <div className="search-hint">
          <Spinner label="검색하는 중" />
        </div>
      ) : search.isError && !search.data ? (
        <div role="alert" className="search-hint grid gap-3">
          <p>{searchErrorMessage(normalizeApiError(search.error))}</p>
          <Button
            variant="secondary"
            className="justify-self-start"
            onClick={() => void search.refetch()}
          >
            다시 시도
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="search-hint">
          ‘{search.data?.query ?? term}’ 검색 결과가 없습니다.
        </p>
      ) : (
        <div
          id={`${id}-results`}
          role="listbox"
          aria-label="검색 결과"
          className="search-results"
          aria-busy={search.isPlaceholderData || undefined}
        >
          {groups.map((group, g) => (
            <div
              key={group.type}
              role="group"
              aria-labelledby={`${id}-group-${group.type}`}
            >
              <p
                id={`${id}-group-${group.type}`}
                className="search-group-title"
                role="presentation"
              >
                {searchTypeLabels[group.type]}
              </p>
              {group.items.map((item, offset) => {
                const position = (starts[g] ?? 0) + offset;
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    id={`${id}-option-${position}`}
                    role="option"
                    aria-selected={position === current}
                    className="search-option"
                    onPointerMove={() => setActive(position)}
                    onClick={() => open(position)}
                  >
                    <SearchItemLine item={item} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {term && items.length > 0 && (
        <Link
          href={`/search?q=${encodeURIComponent(term)}`}
          className="search-all"
          onClick={onClose}
        >
          전체 결과 보기
        </Link>
      )}
    </div>
  );
}

export function SearchItemLine({
  item,
}: {
  readonly item: Parameters<typeof itemMeta>[0];
}) {
  return (
    <>
      {item.key && (
        <span className="search-option-key tabular-nums">{item.key}</span>
      )}
      <span className="search-option-title">{item.title}</span>
      <span className="search-option-meta">
        {itemMeta(item).map((value) => (
          <span key={value}>{value}</span>
        ))}
      </span>
    </>
  );
}
