"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Badge, Button, Checkbox, Field, Input, Select } from "@/shared/ui";
import { repositoryName } from "@/shared/lib";
import {
  type InstallableRepository,
  type ProjectRepository,
  useLinkRepository,
} from "../api/integrations";
import { linkInBatches, type LinkOutcome } from "../model/batch-link";
import { githubLinkFailureReason } from "../model/github-error";
import {
  chosenIds,
  defaultRepositoryId,
  isSelectable,
  settledResults,
  statusLabel,
} from "../model/link-selection";

const NO_DEFAULT = "";

export function RepositoryLinkForm({
  projectId,
  installable,
  linked,
  running,
  onRunningChange,
}: {
  readonly projectId: string;
  readonly installable: readonly InstallableRepository[];
  readonly linked: readonly ProjectRepository[];
  /** 부모가 들고 있어 묶음이 도는 동안 편집 마침으로 폼을 닫지 못하게 한다. */
  readonly running: boolean;
  readonly onRunningChange: (running: boolean) => void;
}) {
  const { link, refresh } = useLinkRepository(projectId);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [results, setResults] = useState<ReadonlyMap<number, LinkOutcome>>(
    new Map(),
  );
  const [summary, setSummary] = useState("");
  const [defaultId, setDefaultId] = useState(NO_DEFAULT);
  const [focusRequest, setFocusRequest] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);

  // 폼이 사라지면(다른 탭으로 이동 등) 남은 요청을 멈춘다.
  useEffect(() => () => abortRef.current?.abort(), []);

  // 묶음이 끝나면 첫 실패 저장소, 없으면 결과 요약으로 초점을 옮긴다.
  // 그사이 사용자가 폼 밖으로 초점을 옮겼다면 건드리지 않는다.
  useEffect(() => {
    if (focusRequest === 0) return;
    const active = document.activeElement;
    const form = summaryRef.current?.closest("form");
    if (active && active !== document.body && !form?.contains(active)) return;
    const failed = listRef.current?.querySelector<HTMLInputElement>(
      '[data-outcome="failed"] input',
    );
    (failed ?? summaryRef.current)?.focus();
  }, [focusRequest]);

  const linkedIds = new Set(linked.map((repo) => repo.repositoryId));
  const currentDefault = linked.find((repo) => repo.isDefault);
  const repositories = installable.filter((repo) => !repo.archived);
  const selectable = (repo: InstallableRepository) =>
    isSelectable(repo.repositoryId, linkedIds, results);
  const visible = repositories.filter((repo) =>
    repositoryName(repo).toLowerCase().includes(search.toLowerCase()),
  );
  const visibleSelectable = visible.filter(selectable);
  const chosen = chosenIds(
    repositories.map((repo) => repo.repositoryId),
    selected,
    linkedIds,
    results,
  );
  const chosenRepositories = repositories.filter((repo) =>
    chosen.includes(repo.repositoryId),
  );
  const allVisibleChosen =
    visibleSelectable.length > 0 &&
    visibleSelectable.every((repo) => selected.has(repo.repositoryId));

  const toggle = (ids: readonly number[], on: boolean) => {
    if (running) return;
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const submit = async () => {
    if (running || chosen.length === 0) return;
    const byId = new Map(
      chosenRepositories.map((repo) => [repo.repositoryId, repo]),
    );
    const ids = [...byId.keys()];
    const defaultFor = defaultRepositoryId(
      ids,
      defaultId === NO_DEFAULT ? null : Number(defaultId),
      currentDefault !== undefined,
    );
    const controller = new AbortController();
    abortRef.current = controller;
    const outcomes = new Map<number, LinkOutcome>();
    let done = 0;
    onRunningChange(true);
    setResults(new Map());
    setSummary(`${ids.length}개 중 0개 처리함`);
    try {
      const notLinked = await linkInBatches(
        ids,
        (id, signal) => link(byId.get(id)!, id === defaultFor, signal),
        (id, outcome) => {
          outcomes.set(id, outcome);
          if (outcome.status !== "linking") done++;
          setResults(new Map(outcomes));
          setSummary(`${ids.length}개 중 ${done}개 처리함`);
        },
        githubLinkFailureReason,
        { signal: controller.signal },
      );
      const failedCount = [...outcomes.values()].filter(
        (o) => o.status === "failed",
      ).length;
      const parts = [`${ids.length - notLinked.length}개 연결됨`];
      if (failedCount > 0) parts.push(`${failedCount}개 실패`);
      if (notLinked.length > failedCount)
        parts.push(`${notLinked.length - failedCount}개 취소됨`);
      setSummary(parts.join(", "));
      // 실패, 취소, 시작 전 저장소만 선택에 남겨 바로 다시 시도할 수 있게 한다.
      setSelected(new Set(notLinked));
      await refresh();
    } finally {
      // 목록을 다시 받은 뒤라 연결됨은 목록이 보여 준다. 실패와 취소만 남긴다.
      setResults(settledResults(outcomes, new Set()));
      abortRef.current = null;
      onRunningChange(false);
      setFocusRequest((n) => n + 1);
    }
  };

  const blockWhileRunning = (event: MouseEvent) => {
    if (running) event.preventDefault();
  };

  return (
    <form
      className="grid gap-3"
      aria-busy={running}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          {/* 도는 동안에는 disabled 대신 aria-disabled로 두어 초점이 body로 빠지지 않게 한다. */}
          <Checkbox
            checked={allVisibleChosen}
            disabled={!running && visibleSelectable.length === 0}
            aria-disabled={running || undefined}
            onClick={blockWhileRunning}
            onChange={(event) =>
              toggle(
                visibleSelectable.map((repo) => repo.repositoryId),
                event.target.checked,
              )
            }
            onKeyDown={submitOnEnter}
          />
          보이는 저장소 모두 선택
        </label>
        <p className="text-sm text-muted">{chosen.length}개 선택됨</p>
      </div>
      <ul
        ref={listRef}
        aria-label="연결할 저장소"
        className="max-h-96 divide-y divide-border overflow-y-auto"
      >
        {visible.map((repo) => {
          const id = repo.repositoryId;
          const status = statusLabel(id, linkedIds, results);
          const outcome = results.get(id)?.status;
          const failed = outcome === "failed" && !linkedIds.has(id);
          return (
            <li
              key={id}
              className="py-2"
              data-outcome={failed ? "failed" : undefined}
            >
              <label className="flex items-center gap-3">
                <Checkbox
                  checked={
                    linkedIds.has(id) ||
                    outcome === "linked" ||
                    selected.has(id)
                  }
                  disabled={!running && !selectable(repo)}
                  aria-disabled={running || undefined}
                  onClick={blockWhileRunning}
                  onChange={(event) => toggle([id], event.target.checked)}
                  onKeyDown={submitOnEnter}
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {repositoryName(repo)}
                </span>
                <Badge>{repo.private ? "비공개" : "공개"}</Badge>
              </label>
              {/* 결과가 들어와도 줄 높이가 바뀌지 않게 상태 줄 자리를 늘 잡아 둔다. */}
              <p
                className={`h-5 truncate pl-7 text-sm ${failed ? "text-danger" : "text-muted"}`}
                title={status || undefined}
              >
                {status}
              </p>
            </li>
          );
        })}
      </ul>
      {/* 안내 줄은 늘 두 줄 자리를 잡아, 완료 뒤 문구가 바뀌어도 아래가 밀리지 않게 한다. */}
      <p className="min-h-10 text-sm text-muted">
        {repositories.filter(selectable).length === 0
          ? "새로 연결할 저장소가 없습니다. 설치 허용과 보관 여부를 확인하세요."
          : visible.length === 0
            ? "검색 결과가 없습니다. 검색어를 바꿔보세요."
            : repositories.some((repo) => repo.private)
              ? "연결하면 열린 Issue를 업무로 가져옵니다. 비공개 저장소의 업무는 원본 저장소 권한이 있는 참여자에게만 보여요."
              : "연결하면 열린 Issue를 업무로 가져옵니다."}
      </p>
      {/* 기본 저장소가 생겨도 자리를 유지하도록 늘 그리고, 이미 있으면 현재 값을 보여 주며 잠근다. */}
      <Field
        id="link-default-repository"
        label="연결하면서 기본 발행 저장소로 지정"
      >
        <Select
          id="link-default-repository"
          disabled={!running && currentDefault !== undefined}
          aria-disabled={running || undefined}
          value={currentDefault ? "current" : defaultId}
          onChange={(event) => {
            if (!running) setDefaultId(event.target.value);
          }}
        >
          {currentDefault ? (
            <option value="current">
              이미 지정됨: {repositoryName(currentDefault)}
            </option>
          ) : (
            <>
              <option value={NO_DEFAULT}>지정 안 함</option>
              {chosenRepositories.map((repo) => (
                <option key={repo.repositoryId} value={repo.repositoryId}>
                  {repositoryName(repo)}
                </option>
              ))}
            </>
          )}
        </Select>
      </Field>
      <p
        ref={summaryRef}
        role="status"
        tabIndex={-1}
        className="h-5 text-sm outline-none"
      >
        {summary}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant="secondary"
          disabled={!running && chosen.length === 0}
          aria-disabled={running || undefined}
          aria-busy={running || undefined}
        >
          선택한 {chosen.length}개 연결
        </Button>
        {running && (
          <Button variant="ghost" onClick={() => abortRef.current?.abort()}>
            취소
          </Button>
        )}
      </div>
    </form>
  );
}

// 체크박스는 Enter로 폼을 제출하지 않으므로 직접 제출한다. Space 토글은 기본 동작 그대로다.
function submitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
}
