"use client";

import { type KeyboardEvent, useState } from "react";
import { Badge, Button, Checkbox, Field, Input, Select } from "@/shared/ui";
import { repositoryName } from "@/shared/lib";
import {
  type InstallableRepository,
  type ProjectRepository,
  useLinkRepository,
} from "../api/integrations";
import { linkInBatches, type LinkOutcome } from "../model/batch-link";
import { githubLinkFailureReason } from "../model/github-error";

const NO_DEFAULT = "";

export function RepositoryLinkForm({
  projectId,
  installable,
  linked,
}: {
  readonly projectId: string;
  readonly installable: readonly InstallableRepository[];
  readonly linked: readonly ProjectRepository[];
}) {
  const { link, refresh } = useLinkRepository(projectId);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [results, setResults] = useState<ReadonlyMap<number, LinkOutcome>>(
    new Map(),
  );
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);
  const [defaultId, setDefaultId] = useState(NO_DEFAULT);

  const linkedIds = new Set(linked.map((repo) => repo.repositoryId));
  const hasDefault = linked.some((repo) => repo.isDefault);
  const repositories = installable.filter((repo) => !repo.archived);
  const selectable = (repo: InstallableRepository) =>
    !linkedIds.has(repo.repositoryId) && repo.accessible !== false;
  const visible = repositories.filter((repo) =>
    repositoryName(repo).toLowerCase().includes(search.toLowerCase()),
  );
  const visibleSelectable = visible.filter(selectable);
  // 연결되었거나 사라진 저장소는 선택에서 뺀다.
  const chosen = repositories.filter(
    (repo) => selectable(repo) && selected.has(repo.repositoryId),
  );
  const allVisibleChosen =
    visibleSelectable.length > 0 &&
    visibleSelectable.every((repo) => selected.has(repo.repositoryId));
  const outcomes = [...results.values()];
  const linkedCount = outcomes.filter((o) => o.status === "linked").length;
  const failedCount = outcomes.filter((o) => o.status === "failed").length;

  const toggle = (ids: readonly number[], on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const submit = async () => {
    if (running || chosen.length === 0) return;
    const byId = new Map(chosen.map((repo) => [repo.repositoryId, repo]));
    setRunning(true);
    setTotal(byId.size);
    setResults(new Map());
    try {
      const failed = await linkInBatches(
        [...byId.keys()],
        (id) => link(byId.get(id)!, String(id) === defaultId),
        (id, outcome) =>
          setResults((current) => new Map(current).set(id, outcome)),
        githubLinkFailureReason,
      );
      // 실패한 저장소만 선택에 남겨 바로 다시 시도할 수 있게 한다.
      setSelected(new Set(failed));
      await refresh();
    } finally {
      setRunning(false);
    }
  };

  const statusText = (repo: InstallableRepository) => {
    const outcome = results.get(repo.repositoryId);
    if (outcome?.status === "linking") return "연결 중";
    if (outcome?.status === "failed") return `실패: ${outcome.reason}`;
    if (outcome?.status === "linked" || linkedIds.has(repo.repositoryId))
      return "연결됨";
    if (repo.accessible === false) return "원본 저장소 접근 권한 없음";
    return "";
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
          <Checkbox
            checked={allVisibleChosen}
            disabled={running || visibleSelectable.length === 0}
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
        aria-label="연결할 저장소"
        className="max-h-96 divide-y divide-border overflow-y-auto"
      >
        {visible.map((repo) => {
          const status = statusText(repo);
          const failed = results.get(repo.repositoryId)?.status === "failed";
          return (
            <li key={repo.repositoryId} className="py-2">
              <label className="flex items-center gap-3">
                <Checkbox
                  checked={
                    linkedIds.has(repo.repositoryId) ||
                    selected.has(repo.repositoryId)
                  }
                  disabled={running || !selectable(repo)}
                  onChange={(event) =>
                    toggle([repo.repositoryId], event.target.checked)
                  }
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
      {repositories.filter(selectable).length === 0 ? (
        <p className="text-sm text-muted">
          새로 연결할 수 있는 저장소가 없습니다. 설치에 허용된 저장소와 보관
          여부를 확인하세요.
        </p>
      ) : (
        visible.length === 0 && (
          <p className="text-sm text-muted">
            검색 결과가 없습니다. 검색어를 바꿔보세요.
          </p>
        )
      )}
      {repositories.some((repo) => repo.private && selectable(repo)) && (
        <p className="text-sm text-muted">
          연결하면 열린 Issue를 업무로 가져옵니다. 비공개 저장소의 업무는 원본
          저장소 권한이 있는 참여자에게만 보여요.
        </p>
      )}
      {!hasDefault && (
        <Field
          id="link-default-repository"
          label="연결하면서 기본 발행 저장소로 지정"
        >
          <Select
            id="link-default-repository"
            disabled={running}
            value={defaultId}
            onChange={(event) => setDefaultId(event.target.value)}
          >
            <option value={NO_DEFAULT}>지정 안 함</option>
            {chosen.map((repo) => (
              <option key={repo.repositoryId} value={repo.repositoryId}>
                {repositoryName(repo)}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <p role="status" className="h-5 text-sm">
        {results.size > 0 &&
          (running
            ? `${total}개 중 ${linkedCount + failedCount}개 처리함`
            : failedCount > 0
              ? `${linkedCount}개 연결됨, ${failedCount}개 실패`
              : `${linkedCount}개 모두 연결함`)}
      </p>
      <Button
        type="submit"
        variant="secondary"
        className="justify-self-start"
        disabled={chosen.length === 0}
        loading={running}
      >
        선택한 {chosen.length}개 연결
      </Button>
    </form>
  );
}

// 체크박스는 Enter로 폼을 제출하지 않으므로 직접 제출한다. Space 토글은 기본 동작 그대로다.
function submitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
}
