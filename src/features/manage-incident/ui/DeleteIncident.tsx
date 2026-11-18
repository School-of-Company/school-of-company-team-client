"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  incidentApi,
  incidentErrorMessage,
  incidentKeys,
} from "@/entities/incident";
import { routes } from "@/shared/config";
import { Button, Dialog } from "@/shared/ui";

/** 헤드 어드민만. 타임라인·사후 검토·조치 항목은 함께 지워지고, 조치 항목으로 만든 업무와 Discord 대화는 남는다. */
export function DeleteIncident({
  incidentId,
}: {
  readonly incidentId: string;
}) {
  const router = useRouter();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => incidentApi.remove(incidentId),
    onSuccess: async () => {
      client.removeQueries({ queryKey: incidentKeys.detail(incidentId) });
      client.removeQueries({ queryKey: incidentKeys.postmortem(incidentId) });
      await client.invalidateQueries({ queryKey: incidentKeys.all });
      router.push(routes.incidents);
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
      <Dialog open={open} onClose={close} title="사고를 삭제할까요?">
        <div className="grid gap-4">
          <p className="text-sm text-foreground-2">
            타임라인과 사후 검토가 함께 지워집니다. 조치 항목으로 만든 업무와
            Discord 대화는 남습니다.
          </p>
          {remove.error ? (
            <p role="alert" className="text-sm text-danger">
              {incidentErrorMessage(remove.error)}
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
