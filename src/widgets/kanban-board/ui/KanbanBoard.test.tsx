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
