"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  opsApi,
  opsKeys,
  serviceErrorMessage,
  type ServiceOps,
  type WebhookSecret,
} from "@/entities/service";
import { formatDate } from "@/shared/lib";
import { Button, CopyField, Dialog } from "@/shared/ui";
import { ConfirmDialog } from "./ConfirmDialog";

// 끝의 / 를 떼어 path(/api/...)와 붙여도 // 가 생기지 않게 한다.
const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

/**
 * 업타임 웹훅(BetterStack, UptimeRobot). 비밀값은 발급 응답에서 한 번만 보이고, 창을 닫으면 메모리에서도 버린다.
 * useMutation 을 쓰지 않는다(MutationCache 에 응답이 몇 분 남는다). API 를 직접 부르고 이 컴포넌트 상태에만 두며,
 * 화면을 떠나면(언마운트) 늦게 온 응답도 버린다. 쿼리 캐시와 브라우저 저장소에는 넣지 않는다.
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
  const [issued, setIssued] = useState<WebhookSecret | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const rotate = () => {
    setPending(true);
    setError(null);
    opsApi.rotateWebhookSecret(serviceId).then(
      (secret) => {
        void client.invalidateQueries({ queryKey: opsKeys.service(serviceId) });
        if (!mounted.current) return;
        setIssued(secret);
        setConfirming(false);
        setPending(false);
      },
      (failure: unknown) => {
        if (!mounted.current) return;
        setError(failure);
        setPending(false);
      },
    );
  };
  const url = `${apiBase}${ops.webhook.path}`;
  return (
    <section aria-labelledby="ops-webhook" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="ops-webhook">업타임 웹훅</h2>
        {ops.canEdit && (
          <Button
            variant="secondary"
            className="ui-button-sm"
            loading={pending && !confirming}
            onClick={() => {
              setError(null);
              if (ops.webhook.configured) setConfirming(true);
              else rotate();
            }}
          >
            {ops.webhook.configured ? "비밀값 재발급" : "비밀값 발급"}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted">
        {ops.webhook.configured
          ? `비밀값 발급됨${ops.webhook.rotatedAt ? `, ${formatDate(ops.webhook.rotatedAt)} 마지막 발급` : ""}`
          : "비밀값을 발급하면 모니터링 도구가 이 주소로 다운과 복구를 알려요."}
      </p>
      <CopyField id="ops-webhook-url" label="웹훅 주소" value={url} />
      {error !== null && !confirming && (
        <p role="alert" className="text-sm text-danger">
          {serviceErrorMessage(error)}
        </p>
      )}
      <details className="ops-setup text-sm">
        <summary className="font-medium">연결 방법</summary>
        <div className="grid gap-2 pt-2 text-foreground-2">
          <p>
            운영 서버 API 주소는{" "}
            <code>https://school-of-company.https.gsmsv.site</code>
            입니다(화면은 https://team.schoolofcompany.com). 위 웹훅 주소는 이
            화면이 쓰는 API 주소로 만듭니다.
          </p>
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
        description="새 비밀값을 만들면 이전 값은 바로 못 써요. 모니터링 도구 설정도 새 값으로 바꿔야 해요."
        confirmLabel="재발급"
        pending={pending}
        error={error !== null ? serviceErrorMessage(error) : undefined}
        onConfirm={rotate}
        onClose={() => setConfirming(false)}
      />
      <Dialog
        open={!!issued}
        onClose={() => setIssued(null)}
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
              <Button onClick={() => setIssued(null)}>닫기</Button>
            </div>
          </div>
        )}
      </Dialog>
    </section>
  );
}
