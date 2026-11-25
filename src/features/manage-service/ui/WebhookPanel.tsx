"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  opsApi,
  opsKeys,
  serviceErrorMessage,
  type ServiceOps,
} from "@/entities/service";
import { formatDate } from "@/shared/lib";
import { Button, CopyField, Dialog } from "@/shared/ui";
import { ConfirmDialog } from "./ConfirmDialog";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * 업타임 웹훅(BetterStack, UptimeRobot). 비밀값은 발급 응답에서 한 번만 보이고, 창을 닫으면 메모리에서도 버린다.
 * 쿼리 캐시와 브라우저 저장소에는 넣지 않는다.
 */
export function WebhookPanel({
  serviceId,
  ops,
}: {
  readonly serviceId: string;
  readonly ops: ServiceOps;
}) {
  const client = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const rotate = useMutation({
    mutationFn: () => opsApi.rotateWebhookSecret(serviceId),
    onSuccess: () => {
      setConfirming(false);
      void client.invalidateQueries({ queryKey: opsKeys.service(serviceId) });
    },
  });
  const url = `${apiBase}${ops.webhook.path}`;
  const issued = rotate.data;
  return (
    <section aria-labelledby="ops-webhook" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="ops-webhook">업타임 웹훅</h2>
        {ops.canEdit && (
          <Button
            variant="secondary"
            className="ui-button-sm"
            loading={rotate.isPending && !confirming}
            onClick={() => {
              rotate.reset();
              if (ops.webhook.configured) setConfirming(true);
              else rotate.mutate();
            }}
          >
            {ops.webhook.configured ? "비밀값 재발급" : "비밀값 발급"}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted">
        {ops.webhook.configured
          ? `비밀값 발급됨${ops.webhook.rotatedAt ? `, ${formatDate(ops.webhook.rotatedAt)} 마지막 발급` : ""}. 모니터링 도구가 다운을 알리면 장애가 자동으로 만들어집니다.`
          : "비밀값을 발급하면 모니터링 도구가 이 주소로 다운과 복구를 알릴 수 있습니다."}
      </p>
      <CopyField id="ops-webhook-url" label="웹훅 주소" value={url} />
      {rotate.isError && !confirming && (
        <p role="alert" className="text-sm text-danger">
          {serviceErrorMessage(rotate.error)}
        </p>
      )}
      <details className="ops-setup text-sm">
        <summary className="font-medium">연결 방법</summary>
        <div className="grid gap-2 pt-2 text-foreground-2">
          <p>
            비밀값은 헤더 <code>X-Hub-Webhook-Secret</code>에 넣는 것을
            권장합니다. 헤더를 넣을 수 없으면 주소 끝에{" "}
            <code>?token=비밀값</code>을 붙입니다(프록시 로그에 남을 수
            있습니다).
          </p>
          <p>
            <strong>BetterStack</strong>: 알림 연동에서 Webhook을 추가하고 위
            주소를 넣은 뒤, 사용자 지정 헤더에 비밀값을 넣습니다. 사건 생성과
            해결 알림을 모두 켭니다.
          </p>
          <p>
            <strong>UptimeRobot</strong>: Alert Contact에서 Webhook을 고르고 위
            주소를 넣습니다. JSON으로 보내기를 켜고 본문을{" "}
            <code>
              {'{"alertType": *alertType*, "alertDetails": "*alertDetails*"}'}
            </code>
            로 둡니다. 다운과 복구 알림을 모두 켭니다.
          </p>
        </div>
      </details>
      <ConfirmDialog
        open={confirming}
        title="비밀값을 재발급할까요?"
        description="새 비밀값을 만들면 이전 값은 바로 쓸 수 없습니다. 모니터링 도구의 설정도 새 값으로 바꿔야 합니다."
        confirmLabel="재발급"
        pending={rotate.isPending}
        error={rotate.isError ? serviceErrorMessage(rotate.error) : undefined}
        onConfirm={() => rotate.mutate()}
        onClose={() => setConfirming(false)}
      />
      <Dialog
        open={!!issued}
        onClose={() => rotate.reset()}
        title="웹훅 비밀값"
      >
        {issued && (
          <div className="grid gap-4">
            <p role="alert" className="service-notice text-sm">
              이 비밀값은 지금 한 번만 보여 드립니다. 창을 닫으면 다시 볼 수
              없으니 모니터링 도구에 바로 넣으세요.
            </p>
            <CopyField
              id="ops-webhook-secret"
              label="비밀값"
              value={issued.secret}
            />
            <CopyField
              id="ops-webhook-issued-url"
              label="웹훅 주소"
              value={`${apiBase}${issued.path}`}
            />
            <div className="flex justify-end">
              <Button onClick={() => rotate.reset()}>닫기</Button>
            </div>
          </div>
        )}
      </Dialog>
    </section>
  );
}
