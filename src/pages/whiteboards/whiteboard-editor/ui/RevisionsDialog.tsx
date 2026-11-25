"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  whiteboardApi,
  whiteboardErrorMessage,
  whiteboardQueries,
  type WhiteboardScene,
} from "@/entities/whiteboard";
import { formatDate } from "@/shared/lib";
import {
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Skeleton,
  useToast,
} from "@/shared/ui";

/**
 * 변경 이력(D10-9). 같은 사람이 5분 안에 이어 저장한 것은 한 줄이다. 실시간 방이 한 저장은 1분에 한 줄이다(s19 D19-15).
 * 되돌리기는 서버 restore 대신 이력 scene 을 받아 캔버스에서 새 저장으로 한다. 요소 version 을 올려야
 * 다른 화면이 병합할 때 되돌린 내용이 이긴다(model/scene.ts restoreOnto).
 */
export function RevisionsDialog({
  open,
  whiteboardId,
  canEdit,
  onClose,
  onRestore,
}: {
  readonly open: boolean;
  readonly whiteboardId: string;
  readonly canEdit: boolean;
  readonly onClose: () => void;
  readonly onRestore: (scene: WhiteboardScene) => void;
}) {
  const toast = useToast();
  const [restoring, setRestoring] = useState<string | null>(null);
  const revisions = useQuery({
    ...whiteboardQueries.revisions(whiteboardId),
    enabled: open,
  });
  async function restore(revisionId: string) {
    setRestoring(revisionId);
    try {
      const revision = await whiteboardApi.revision(whiteboardId, revisionId);
      onRestore(revision.scene);
    } catch (error) {
      toast(whiteboardErrorMessage(error), "error");
    } finally {
      setRestoring(null);
    }
  }
  return (
    <Dialog open={open} onClose={onClose} title="변경 이력">
      {revisions.isPending ? (
        <Skeleton className="h-32" />
      ) : !revisions.data ? (
        <ErrorState
          description={whiteboardErrorMessage(revisions.error)}
          onRetry={() => void revisions.refetch()}
        />
      ) : revisions.data.length === 0 ? (
        <EmptyState title="변경 이력이 없습니다" />
      ) : (
        <ul className="list" aria-label="변경 이력">
          {revisions.data.map((revision, index) => (
            <li key={revision.id} className="list-row">
              <span className="list-row-main">
                <span className="list-row-title">
                  {index === 0 ? "지금" : `v${revision.version}`}
                </span>
              </span>
              <span className="list-row-meta">
                <span>{revision.createdBy?.name ?? "알 수 없음"}</span>
                <span className="tabular-nums">
                  {formatDate(revision.updatedAt, {
                    year: undefined,
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {canEdit && index > 0 && (
                  <Button
                    variant="secondary"
                    className="ui-button-sm"
                    loading={restoring === revision.id}
                    disabled={!!restoring}
                    onClick={() => void restore(revision.id)}
                  >
                    되돌리기
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
