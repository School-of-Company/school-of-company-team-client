import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Board } from "@/entities/task";
import { KanbanBoard } from "./KanbanBoard";

const empty: Board = {
  groups: [
    {
      key: null,
      label: "전체",
      columns: {
        BACKLOG: [],
        PLANNED: [],
        IN_PROGRESS: [],
        REVIEW: [],
        DONE: [],
      },
    },
  ],
  counts: { BACKLOG: 0, PLANNED: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 },
};

const render = (filtered: boolean, onCreate?: () => void) =>
  renderToStaticMarkup(
    <KanbanBoard
      board={empty}
      sort="manual"
      editable={() => true}
      pending={false}
      onMove={() => {}}
      onMore={() => {}}
      onCreate={onCreate}
      visibleStatus="BACKLOG"
      onVisibleStatus={() => {}}
      filtered={filtered}
      onClearFilters={() => {}}
    />,
  );

test("an empty board without filters offers the first task, not a filter change", () => {
  const html = render(false, () => {});
  assert.match(html, /업무가 없습니다/);
  assert.match(html, /업무 추가/);
  assert.doesNotMatch(html, /필터/);
});

test("an empty board without filters and no create right shows no action", () => {
  const html = render(false);
  assert.match(html, /업무가 없습니다/);
  assert.doesNotMatch(html, /<button/);
});

test("an empty filtered board offers to reset the filters", () => {
  const html = render(true, () => {});
  assert.match(html, /조건에 맞는 업무가 없습니다/);
  assert.match(html, /필터 초기화/);
  assert.doesNotMatch(html, /업무 추가/);
});

const columns = (cards: number) => ({
  BACKLOG: Array.from({ length: cards }, (_, index) => ({
    id: `T${index}`,
    key: `HUB-${index}`,
    scope: "PROJECT" as const,
    projectId: "P",
    projectKey: "HUB",
    projectName: "Hub",
    seq: index,
    part: null,
    title: `업무 ${index}`,
    type: "TASK" as const,
    status: "BACKLOG" as const,
    priority: "P2" as const,
    assignees: [],
    deadline: null,
    blocked: false,
    blockedReason: null,
    position: index,
    completedAt: null,
  })),
  PLANNED: [],
  IN_PROGRESS: [],
  REVIEW: [],
  DONE: [],
});

test("archived bucket lanes take no new tasks while active and unbucketed lanes keep the add buttons", () => {
  const html = renderToStaticMarkup(
    <KanbanBoard
      board={{
        groups: [
          { key: "B1", label: "이번 주기", columns: columns(0) },
          { key: "B9", label: "지난 주기", columns: columns(1) },
          { key: null, label: "버킷 없음", columns: columns(0) },
        ],
        counts: { BACKLOG: 1, PLANNED: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 },
      }}
      sort="manual"
      groupBy="bucket"
      archivedBuckets={["B9"]}
      editable={() => true}
      pending={false}
      onMove={() => {}}
      onMore={() => {}}
      onCreate={() => {}}
      visibleStatus="BACKLOG"
      onVisibleStatus={() => {}}
      filtered={false}
      onClearFilters={() => {}}
    />,
  );
  const lanes = html.split('class="board-lane ').slice(1);
  const adds = (lane: string) => lane.match(/업무 추가"/g)?.length ?? 0;
  assert.equal(lanes.length, 3);
  assert.equal(adds(lanes[0]), 5);
  assert.match(lanes[1], /보관됨, 새로 넣을 수 없음/);
  assert.equal(adds(lanes[1]), 0);
  assert.equal(adds(lanes[2]), 5);
});

test("a grouped board with a single lane shows no lane header, so the board does not move", () => {
  const html = renderToStaticMarkup(
    <KanbanBoard
      board={{
        groups: [{ key: null, label: "파트 없음", columns: columns(1) }],
        counts: { BACKLOG: 1, PLANNED: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 },
      }}
      sort="manual"
      groupBy="part"
      editable={() => true}
      pending={false}
      onMove={() => {}}
      onMore={() => {}}
      visibleStatus="BACKLOG"
      onVisibleStatus={() => {}}
      filtered={false}
      onClearFilters={() => {}}
    />,
  );
  assert.doesNotMatch(html, /board-lane-header/);
  assert.doesNotMatch(html, /파트 없음/);
  // 빈 컬럼도 같은 빈 상태를 보인다.
  assert.equal(html.match(/class="board-empty"/g)?.length, 4);
});
