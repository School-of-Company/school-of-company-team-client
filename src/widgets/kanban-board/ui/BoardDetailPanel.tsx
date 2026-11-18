"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { Dialog } from "@/shared/ui";

export type BoardDetailComponent = ComponentType<{
  readonly taskId: string;
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
      className="board-detail-panel inset-y-0! right-0! left-auto! m-0! h-dvh! max-h-dvh! w-full! max-w-2xl! rounded-none! border-y-0! border-r-0!"
    >
      <Link
        href={`/tasks/${encodeURIComponent(taskId)}`}
        className="mb-3 inline-flex min-h-11 items-center text-sm text-muted underline hover:text-foreground"
      >
        전체 페이지로 열기
      </Link>
      <Detail key={taskId} taskId={taskId} user={user} />
    </Dialog>
  );
}
