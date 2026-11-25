"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TemplatePicker,
  whiteboardErrorMessage,
  whiteboardQueries,
  type WhiteboardTemplate,
} from "@/entities/whiteboard";
import { Button, Dialog, ErrorState, Skeleton } from "@/shared/ui";

/** 지금 보드에 템플릿 내용을 넣는다(새 id 로 복제). 빈 템플릿은 넣을 것이 없어 뺀다. */
export function TemplateInsertDialog({
  open,
  onClose,
  onInsert,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onInsert: (template: WhiteboardTemplate) => void;
}) {
  const templates = useQuery({
    ...whiteboardQueries.templates(),
    enabled: open,
  });
  const [templateId, setTemplateId] = useState("");
  const choices = templates.data?.filter(
    (template) => template.scene.elements.length > 0,
  );
  const chosen = choices?.find((template) => template.id === templateId);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="템플릿 넣기"
      className="whiteboard-dialog"
    >
      <div className="grid gap-4">
        {templates.isPending ? (
          <Skeleton className="h-72" />
        ) : !choices ? (
          <ErrorState
            description={whiteboardErrorMessage(templates.error)}
            onRetry={() => void templates.refetch()}
          />
        ) : (
          <TemplatePicker
            name="whiteboard-insert-template"
            templates={choices}
            value={templateId}
            onChange={setTemplateId}
          />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="primary"
            disabled={!chosen}
            onClick={() => {
              if (!chosen) return;
              onInsert(chosen);
              onClose();
            }}
          >
            넣기
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
