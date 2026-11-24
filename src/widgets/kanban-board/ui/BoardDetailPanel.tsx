"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { Dialog, Icon } from "@/shared/ui";

export type BoardDetailComponent = ComponentType<{
  readonly taskId: string;
  readonly headerAction?: ReactNode;
  readonly user?: {
    readonly id: string;
    readonly role: string;
    readonly name: string;
  };
}>;

export function BoardDetailPanel({
  taskId,
  user,
  Detail,
  onClose,
}: {
  readonly taskId: string;
  readonly user?: {
    readonly id: string;
    readonly role: string;
    readonly name: string;
  };
  readonly Detail: BoardDetailComponent;
  readonly onClose: () => void;
}) {
  return (
    <Dialog
      open
      onClose={onClose}
      title="업무 상세"
      className="board-detail-panel"
    >
      <Detail
        key={taskId}
        taskId={taskId}
        user={user}
        headerAction={
          <Link
            href={`/tasks/${encodeURIComponent(taskId)}`}
            className="ui-button ui-button-ghost ui-icon-button"
            aria-label="전체 페이지로 열기"
            title="전체 페이지로 열기"
          >
            <Icon name="expand" />
          </Link>
        }
      />
    </Dialog>
  );
}
