"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  whiteboardApi,
  templateErrorMessage,
  whiteboardKeys,
  type WhiteboardTemplate,
} from "@/entities/whiteboard";
import { Button, Dialog, useToast } from "@/shared/ui";

/** 팀 템플릿 지우기(LEAD). 이 템플릿으로 만든 화이트보드는 그대로 남는다(D16-7). */
export function DeleteTemplateDialog({
  template,
  onClose,
  onDeleted,
}: {
  readonly template: WhiteboardTemplate | null;
  readonly onClose: () => void;
  readonly onDeleted?: (templateId: string) => void;
}) {
  const client = useQueryClient();
  const toast = useToast();
  const remove = useMutation({
    mutationFn: (id: string) => whiteboardApi.removeTemplate(id),
    onSuccess: async (_, id) => {
      await client.invalidateQueries({ queryKey: whiteboardKeys.templates });
      toast("팀 템플릿을 지웠어요.", "success");
      onDeleted?.(id);
      onClose();
    },
    onError: (failure) => toast(templateErrorMessage(failure), "error"),
  });
  return (
    <Dialog open={!!template} onClose={onClose} title="팀 템플릿 지우기">
      <p className="text-sm">
        「{template?.name}」을 템플릿 목록에서 지워요. 이 템플릿으로 이미 만든
        화이트보드는 그대로 남아요.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          취소
        </Button>
        <Button
          variant="danger"
          loading={remove.isPending}
          onClick={() => template && remove.mutate(template.id)}
        >
          지우기
        </Button>
      </div>
    </Dialog>
  );
}
