"use client";

import { useState } from "react";
import {
  serviceApi,
  serviceErrorMessage,
  type ServiceDetail,
} from "@/entities/service";
import { Button } from "@/shared/ui";
import { useServiceMutation } from "../api/mutations";
import { ConfirmDialog } from "./ConfirmDialog";

/** 헤드 어드민 전용. 아카이브는 확인을 받고, 복원은 바로 한다. */
export function ArchiveService({
  service,
}: {
  readonly service: ServiceDetail;
}) {
  const [confirming, setConfirming] = useState(false);
  const toggle = useServiceMutation(service.id, (archived: boolean) =>
    serviceApi.archive(service.id, archived),
  );
  if (service.archived)
    return (
      <span className="grid justify-items-end gap-1">
        <Button
          variant="secondary"
          className="ui-button-sm"
          loading={toggle.isPending}
          onClick={() => toggle.mutate(false)}
        >
          복원
        </Button>
        {toggle.error ? (
          <span role="alert" className="text-xs text-danger">
            {serviceErrorMessage(toggle.error)}
          </span>
        ) : null}
      </span>
    );
  return (
    <>
      <Button
        variant="ghost"
        className="ui-button-sm"
        onClick={() => {
          toggle.reset();
          setConfirming(true);
        }}
      >
        아카이브
      </Button>
      <ConfirmDialog
        open={confirming}
        title="서비스 아카이브"
        description={`아카이브하면 이 서비스는 조회만 돼요. 기존 의존관계는 남고, 새 의존 대상으로 고를 수 없어요. 헤드 어드민이 복원할 수 있어요.`}
        confirmLabel="아카이브"
        pending={toggle.isPending}
        error={toggle.error ? serviceErrorMessage(toggle.error) : undefined}
        onClose={() => !toggle.isPending && setConfirming(false)}
        onConfirm={() =>
          toggle.mutate(true, { onSuccess: () => setConfirming(false) })
        }
      />
    </>
  );
}
