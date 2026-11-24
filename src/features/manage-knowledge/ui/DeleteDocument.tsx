"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { incidentKeys } from "@/entities/incident";
import {
  knowledgeApi,
  knowledgeErrorMessage,
  knowledgeKeys,
} from "@/entities/knowledge";
import { routes } from "@/shared/config";
import { Button, Dialog } from "@/shared/ui";

/** 작성자·헤드 어드민만. 관계는 함께 사라지고 연결됐던 서비스·업무·사고·문서는 그대로 남는다. */
export function DeleteDocument({
  documentId,
}: {
  readonly documentId: string;
}) {
  const router = useRouter();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => knowledgeApi.remove(documentId),
    onSuccess: async () => {
      client.removeQueries({ queryKey: knowledgeKeys.detail(documentId) });
      await Promise.all([
        client.invalidateQueries({ queryKey: knowledgeKeys.all }),
        client.invalidateQueries({ queryKey: incidentKeys.all }),
      ]);
      router.push(routes.docs);
    },
  });
  const close = () => {
    if (remove.isPending) return;
    remove.reset();
    setOpen(false);
  };
  return (
    <>
      <Button
        variant="ghost"
        className="ui-button-sm"
        onClick={() => setOpen(true)}
      >
        삭제
      </Button>
      <Dialog open={open} onClose={close} title="문서를 삭제할까요?">
        <div className="grid gap-4">
          <p className="text-sm text-foreground-2">
            관계도 함께 사라집니다. 연결됐던 서비스, 사고, 업무, 문서는 그대로
            남습니다. 더 쓰지 않는 문서라면 삭제 대신 폐기로 바꿀 수 있습니다.
          </p>
          {remove.error ? (
            <p role="alert" className="text-sm text-danger">
              {knowledgeErrorMessage(remove.error)}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              disabled={remove.isPending}
              onClick={close}
            >
              취소
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => {
                if (!remove.isPending) remove.mutate();
              }}
            >
              삭제
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
