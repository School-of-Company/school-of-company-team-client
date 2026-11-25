"use client";

import { Button, Dialog, Icon, IconButton } from "@/shared/ui";
import { basicShortcuts, shortcuts } from "../model/guide";

function ShortcutList({
  items,
}: {
  readonly items: readonly (readonly [string, string])[];
}) {
  return (
    <dl className="whiteboard-shortcuts">
      {items.map(([keys, action]) => (
        <div key={keys} className="contents">
          <dt>{keys}</dt>
          <dd>{action}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 빈 보드 위에 뜨는 시작 안내. 캔버스 위에 떠 있어 다른 자리를 밀지 않는다. */
export function StartGuide({
  onTemplate,
  onMermaid,
  onClose,
}: {
  readonly onTemplate: () => void;
  readonly onMermaid: () => void;
  readonly onClose: () => void;
}) {
  return (
    <section className="whiteboard-start" aria-labelledby="whiteboard-start">
      <div className="flex items-center justify-between gap-2">
        <h2 id="whiteboard-start" className="text-base font-semibold">
          빈 보드에서 시작하기
        </h2>
        <IconButton
          aria-label="시작 안내 닫기"
          variant="ghost"
          onClick={onClose}
        >
          <Icon name="close" />
        </IconButton>
      </div>
      <p className="text-sm text-muted">
        템플릿을 넣거나 Mermaid 코드를 붙여 넣어 시작하세요. 바로 그려도 됩니다.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" className="ui-button-sm" onClick={onTemplate}>
          템플릿 고르기
        </Button>
        <Button
          variant="secondary"
          className="ui-button-sm"
          onClick={onMermaid}
        >
          Mermaid 붙여넣기
        </Button>
      </div>
      <ShortcutList items={basicShortcuts} />
    </section>
  );
}

export function ShortcutsDialog({
  open,
  onClose,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="단축키">
      <div className="grid gap-3">
        <ShortcutList items={shortcuts} />
        <p className="text-xs text-muted">
          Mac 에서는 Ctrl 대신 ⌘ 를 누릅니다. 캔버스에서 ? 를 누르면 전체
          단축키가 나옵니다.
        </p>
      </div>
    </Dialog>
  );
}
