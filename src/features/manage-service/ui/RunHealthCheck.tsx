"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  healthErrorLabel,
  opsApi,
  opsKeys,
  serviceErrorMessage,
  type ServiceOps,
} from "@/entities/service";
import { normalizeApiError } from "@/shared/api";
import { Button } from "@/shared/ui";
import {
  HEALTH_RUN_COOLDOWN_SECONDS,
  retryAfterSeconds,
} from "../model/health-run";

/**
 * 지금 검사(소유자, LEAD). 결과는 예약 검사처럼 저장되므로 응답으로 상태와 최근 검사를 바로 고치고
 * 24시간 그림과 운영 개요는 다시 받는다. 기다리는 동안 버튼을 끈다(글자는 그대로 두어 폭이 바뀌지 않는다).
 */
export function RunHealthCheck({ serviceId }: { readonly serviceId: string }) {
  const client = useQueryClient();
  const [wait, setWait] = useState(0);
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  const run = useMutation({
    mutationFn: () => opsApi.runHealthCheck(serviceId),
    onSuccess: (data) => {
      setWait(HEALTH_RUN_COOLDOWN_SECONDS);
      client.setQueryData<ServiceOps>(opsKeys.service(serviceId), (old) =>
        old
          ? {
              ...old,
              health: data.health,
              recentChecks: [data.check, ...old.recentChecks].slice(0, 20),
            }
          : old,
      );
      void client.invalidateQueries({ queryKey: opsKeys.history(serviceId) });
      void client.invalidateQueries({ queryKey: opsKeys.overview });
    },
    onError: (error) => {
      const seconds = retryAfterSeconds(error);
      if (seconds) setWait(seconds);
      // 그사이 헬스체크가 꺼졌다(409). 화면의 설정과 상태를 서버 값으로 다시 맞춘다.
      if (normalizeApiError(error).code === "OPS_HEALTH_CHECK_NOT_CONFIGURED")
        void client.invalidateQueries({ queryKey: opsKeys.all });
    },
  });
  const check = run.data?.check;
  const result =
    run.isError && !retryAfterSeconds(run.error)
      ? serviceErrorMessage(run.error)
      : check
        ? check.ok
          ? `검사 성공${check.statusCode ? `, ${check.statusCode}` : ""}${check.latencyMs !== null ? `, ${check.latencyMs}ms` : ""}`
          : `검사 실패${check.errorCode ? `, ${healthErrorLabel(check.errorCode)}` : ""}`
        : "";
  return (
    <span className="flex flex-wrap items-center gap-2">
      {/* 결과만 읽어 준다. 초 단위로 줄어드는 대기 안내는 매초 읽히지 않게 live 영역 밖에 둔다. */}
      <span role="status" className="text-xs text-muted">
        {result}
      </span>
      {wait > 0 && (
        <span className="text-xs text-muted tabular-nums">
          {wait}초 뒤 다시 검사할 수 있습니다
        </span>
      )}
      <Button
        variant="secondary"
        className="ui-button-sm"
        loading={run.isPending}
        disabled={wait > 0}
        onClick={() => run.mutate()}
      >
        지금 검사
      </Button>
    </span>
  );
}
