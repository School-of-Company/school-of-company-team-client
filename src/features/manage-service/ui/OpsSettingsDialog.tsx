"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { knowledgeQueries } from "@/entities/knowledge";
import {
  opsApi,
  opsKeys,
  serviceErrorMessage,
  type ServiceOps,
} from "@/entities/service";
import { Button, Checkbox, Dialog, Field, Input, Select } from "@/shared/ui";
import { opsFormToRequest, opsToForm, type OpsForm } from "../model/ops-form";

/** 헬스체크, 링크, Runbook, Sentry slug 를 한 번에 저장한다(PUT 전체 교체). 소유자와 LEAD 만 연다. */
export function OpsSettingsDialog({
  serviceId,
  ops,
  lead,
  open,
  onClose,
}: {
  readonly serviceId: string;
  readonly ops: ServiceOps;
  /** http 허용은 LEAD 만 바꾼다(D17-2, OPS_HTTP_REQUIRES_LEAD). */
  readonly lead: boolean;
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const client = useQueryClient();
  const [form, setForm] = useState<OpsForm>(() => opsToForm(ops));
  const runbooks = useQuery({
    ...knowledgeQueries.list({ kind: "RUNBOOK" }),
    enabled: open,
  });
  const save = useMutation({
    mutationFn: (value: OpsForm) =>
      opsApi.update(serviceId, opsFormToRequest(value)),
    onSuccess: async (data) => {
      client.setQueryData(opsKeys.service(serviceId), data);
      await client.invalidateQueries({ queryKey: opsKeys.overview });
      onClose();
    },
  });
  const set = <K extends keyof OpsForm>(key: K, value: OpsForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(form);
  };
  const disabled = save.isPending;
  const runbookOptions = runbooks.data ?? [];
  const currentRunbook = ops.links.runbook;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="모니터링 설정"
      className="service-dialog"
    >
      <form className="grid gap-5" onSubmit={submit}>
        <fieldset className="grid gap-3">
          <legend className="text-md mb-2 font-semibold">헬스체크</legend>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.healthEnabled}
              disabled={disabled}
              onChange={(event) => set("healthEnabled", event.target.checked)}
            />
            헬스체크 켜기
          </label>
          {form.healthEnabled && (
            <>
              <Field
                id="ops-health-url"
                label="주소"
                hint="https 주소만 됩니다. 서버는 리다이렉트를 따라가지 않고, 주소를 바꾸면 검사 기록을 지웁니다."
              >
                <Input
                  id="ops-health-url"
                  type="url"
                  required
                  maxLength={2000}
                  spellCheck={false}
                  placeholder="https://example.com/actuator/health"
                  value={form.url}
                  disabled={disabled}
                  aria-describedby="ops-health-url-hint"
                  onChange={(event) => set("url", event.target.value)}
                />
              </Field>
              <div className="ops-form-row">
                <Field id="ops-health-interval" label="간격(초)">
                  <Input
                    id="ops-health-interval"
                    type="number"
                    min={60}
                    max={3600}
                    value={form.intervalSeconds}
                    disabled={disabled}
                    onChange={(event) =>
                      set("intervalSeconds", event.target.value)
                    }
                  />
                </Field>
                <Field id="ops-health-timeout" label="시간 초과(ms)">
                  <Input
                    id="ops-health-timeout"
                    type="number"
                    min={1000}
                    max={10000}
                    value={form.timeoutMs}
                    disabled={disabled}
                    onChange={(event) => set("timeoutMs", event.target.value)}
                  />
                </Field>
                <Field id="ops-health-min" label="기대 상태 최소">
                  <Input
                    id="ops-health-min"
                    type="number"
                    min={100}
                    max={599}
                    value={form.expectedStatusMin}
                    disabled={disabled}
                    onChange={(event) =>
                      set("expectedStatusMin", event.target.value)
                    }
                  />
                </Field>
                <Field id="ops-health-max" label="기대 상태 최대">
                  <Input
                    id="ops-health-max"
                    type="number"
                    min={100}
                    max={599}
                    value={form.expectedStatusMax}
                    disabled={disabled}
                    onChange={(event) =>
                      set("expectedStatusMax", event.target.value)
                    }
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.allowHttp}
                  disabled={disabled || !lead}
                  onChange={(event) => set("allowHttp", event.target.checked)}
                />
                http 주소 허용
                {!lead && (
                  <span className="text-xs text-muted">
                    헤드 어드민만 바꿀 수 있습니다
                  </span>
                )}
              </label>
            </>
          )}
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="text-md mb-2 font-semibold">링크</legend>
          {(
            [
              ["dashboardUrl", "대시보드"],
              ["logsUrl", "로그"],
              ["errorTrackerUrl", "에러 추적"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} id={`ops-${key}`} label={label}>
              <Input
                id={`ops-${key}`}
                type="url"
                maxLength={2000}
                spellCheck={false}
                placeholder="https://"
                value={form[key]}
                disabled={disabled}
                onChange={(event) => set(key, event.target.value)}
              />
            </Field>
          ))}
          <Field
            id="ops-runbook"
            label="Runbook"
            hint="장애 때 따라 할 Runbook 문서를 고릅니다."
          >
            <Select
              id="ops-runbook"
              value={form.runbookDocumentId}
              disabled={disabled || runbooks.isPending}
              aria-describedby="ops-runbook-hint"
              onChange={(event) => set("runbookDocumentId", event.target.value)}
            >
              <option value="">없음</option>
              {currentRunbook &&
                !runbookOptions.some((doc) => doc.id === currentRunbook.id) && (
                  <option value={currentRunbook.id}>
                    {currentRunbook.title}
                  </option>
                )}
              {runbookOptions.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title}
                </option>
              ))}
            </Select>
          </Field>
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="text-md mb-2 font-semibold">Sentry</legend>
          {ops.sentry.status === "NOT_CONFIGURED" && (
            <p className="service-notice text-sm">
              서버에 Sentry 토큰이 없어(NOT_CONFIGURED) 수치를 가져오지
              않습니다. slug는 미리 저장해 둘 수 있습니다.
            </p>
          )}
          <div className="ops-form-row">
            <Field id="ops-sentry-org" label="조직 slug">
              <Input
                id="ops-sentry-org"
                maxLength={100}
                spellCheck={false}
                pattern="[a-z0-9][a-z0-9_\-]*"
                value={form.sentryOrgSlug}
                disabled={disabled}
                onChange={(event) =>
                  set("sentryOrgSlug", event.target.value.trim())
                }
              />
            </Field>
            <Field id="ops-sentry-project" label="프로젝트 slug">
              <Input
                id="ops-sentry-project"
                maxLength={100}
                spellCheck={false}
                pattern="[a-z0-9][a-z0-9_\-]*"
                value={form.sentryProjectSlug}
                disabled={disabled}
                onChange={(event) =>
                  set("sentryProjectSlug", event.target.value.trim())
                }
              />
            </Field>
          </div>
          <p className="text-xs text-muted">
            둘 다 넣거나 둘 다 비웁니다. 바꾸면 수치를 다시 가져옵니다.
          </p>
        </fieldset>
        {save.isError && (
          <p role="alert" className="text-sm text-danger">
            {serviceErrorMessage(save.error)}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={disabled} onClick={onClose}>
            취소
          </Button>
          <Button type="submit" loading={disabled}>
            저장
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
