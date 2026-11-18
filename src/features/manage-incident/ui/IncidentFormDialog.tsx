"use client";

import { useId, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fromLocalInput,
  incidentApi,
  incidentErrorMessage,
  incidentSeverities,
  severityDescriptions,
  toLocalInput,
  type IncidentDetail,
  type IncidentSeverity,
} from "@/entities/incident";
import { serviceQueries } from "@/entities/service";
import { activeUsersQueryOptions } from "@/entities/user";
import {
  Button,
  Checkbox,
  Dialog,
  Field,
  Input,
  Select,
  Spinner,
  Textarea,
} from "@/shared/ui";
import { useIncidentMutation } from "../api/mutations";

type Values = {
  readonly title: string;
  readonly summary: string;
  readonly severity: IncidentSeverity | "";
  readonly commanderId: string;
  readonly serviceIds: readonly string[];
  readonly startedAt: string;
};

/** 사고 등록·수정 대화상자. 등록은 활성 팀원 누구나, 수정은 사고 편집 권한(D7-5). 심각도는 기본값 없이 고르게 한다(D7-2). */
export function IncidentFormDialog({
  open,
  incident,
  onClose,
  onSaved,
}: {
  readonly open: boolean;
  readonly incident?: IncidentDetail;
  readonly onClose: () => void;
  readonly onSaved: (incident: IncidentDetail) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={incident ? "사고 수정" : "사고 등록"}
      className="incident-dialog"
    >
      {open && (
        <IncidentForm incident={incident} onClose={onClose} onSaved={onSaved} />
      )}
    </Dialog>
  );
}

function IncidentForm({
  incident,
  onClose,
  onSaved,
}: {
  readonly incident?: IncidentDetail;
  readonly onClose: () => void;
  readonly onSaved: (incident: IncidentDetail) => void;
}) {
  const id = useId();
  const initial: Values = {
    title: incident?.title ?? "",
    summary: incident?.summary ?? "",
    severity: incident?.severity ?? "",
    commanderId: incident?.commander?.id ?? "",
    serviceIds: incident?.services.map((service) => service.id) ?? [],
    startedAt: incident ? toLocalInput(incident.startedAt) : "",
  };
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<{ title?: string; severity?: string }>(
    {},
  );
  const users = useQuery(activeUsersQueryOptions());
  const services = useQuery(serviceQueries.list(false));
  const save = useIncidentMutation(incident?.id ?? "", (body: Values) => {
    const startedAt = fromLocalInput(body.startedAt);
    const severity = body.severity || undefined;
    if (!incident)
      return incidentApi.create({
        title: body.title.trim(),
        summary: body.summary.trim() || undefined,
        severity: severity ?? "SEV3",
        commanderId: body.commanderId || undefined,
        serviceIds: body.serviceIds,
        startedAt,
      });
    // 바뀐 값만 보낸다(서버는 보낸 값만 바꾸고, 심각도·커맨더가 바뀌면 타임라인에 남긴다).
    const sameServices =
      [...body.serviceIds].sort().join() ===
      [...initial.serviceIds].sort().join();
    return incidentApi.update(incident.id, {
      title:
        body.title.trim() !== initial.title ? body.title.trim() : undefined,
      summary:
        body.summary.trim() !== initial.summary.trim()
          ? body.summary.trim()
          : undefined,
      severity: severity !== initial.severity ? severity : undefined,
      commanderId:
        body.commanderId && body.commanderId !== initial.commanderId
          ? body.commanderId
          : undefined,
      serviceIds: sameServices ? undefined : body.serviceIds,
      startedAt: body.startedAt !== initial.startedAt ? startedAt : undefined,
    });
  });
  const set = (patch: Partial<Values>) =>
    setValues((current) => ({ ...current, ...patch }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (save.isPending) return;
    const next: typeof errors = {};
    if (!values.title.trim()) next.title = "제목을 입력하세요.";
    else if (values.title.trim().length > 200)
      next.title = "제목은 200자까지 쓸 수 있습니다.";
    if (!values.severity) next.severity = "심각도를 고르세요.";
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(values, { onSuccess: onSaved });
  };
  // 이미 걸린 서비스가 나중에 아카이브돼도 교체 때 그대로 둘 수 있다(계약 3.2). 그래서 목록에 함께 보여 준다.
  const serviceOptions = [
    ...(services.data ?? []).map((service) => ({
      id: service.id,
      name: service.name,
      key: service.key,
      archived: false,
    })),
    ...(incident?.services ?? []).filter(
      (service) => !services.data?.some((item) => item.id === service.id),
    ),
  ];
  const commanderOptions = [
    ...(users.data ?? []),
    ...(incident?.commander &&
    !users.data?.some((user) => user.id === incident.commander?.id)
      ? [incident.commander]
      : []),
  ];
  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <Field id={`${id}-title`} label="제목" error={errors.title}>
        <Input
          id={`${id}-title`}
          value={values.title}
          maxLength={200}
          required
          autoFocus
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? `${id}-title-error` : undefined}
          placeholder="예: 로그인 502 급증"
          onChange={(event) => set({ title: event.target.value })}
        />
      </Field>
      <fieldset
        className="grid gap-2"
        aria-describedby={errors.severity ? `${id}-severity-error` : undefined}
      >
        <legend className="mb-2 text-sm font-medium">심각도</legend>
        <div className="incident-severity-options">
          {incidentSeverities.map((severity) => (
            <label key={severity} className="incident-severity-option">
              <input
                type="radio"
                name={`${id}-severity`}
                value={severity}
                checked={values.severity === severity}
                onChange={() => set({ severity })}
              />
              <span className="incident-severity" data-severity={severity}>
                {severity}
              </span>
              <span className="text-xs text-muted">
                {severityDescriptions[severity]}
              </span>
            </label>
          ))}
        </div>
        {errors.severity && (
          <p
            id={`${id}-severity-error`}
            role="alert"
            className="text-sm text-danger"
          >
            {errors.severity}
          </p>
        )}
      </fieldset>
      <div className="incident-form-row">
        <Field id={`${id}-commander`} label="커맨더">
          {users.isPending ? (
            <Spinner label="팀원 불러오는 중" />
          ) : (
            <Select
              id={`${id}-commander`}
              value={values.commanderId}
              onChange={(event) => set({ commanderId: event.target.value })}
            >
              {!incident && <option value="">나</option>}
              {commanderOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          id={`${id}-started`}
          label="시작 시각"
          hint={incident ? undefined : "비우면 지금으로 기록합니다."}
        >
          <Input
            id={`${id}-started`}
            type="datetime-local"
            value={values.startedAt}
            aria-describedby={incident ? undefined : `${id}-started-hint`}
            onChange={(event) => set({ startedAt: event.target.value })}
          />
        </Field>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">영향 서비스</legend>
        {services.isPending ? (
          <Spinner label="서비스 불러오는 중" />
        ) : services.isError ? (
          <p role="alert" className="text-sm text-danger">
            서비스 목록을 불러오지 못했습니다. 영향 서비스는 나중에 고칠 수
            있습니다.
          </p>
        ) : serviceOptions.length === 0 ? (
          <p className="text-sm text-muted">
            등록된 서비스가 없습니다. 영향 서비스 없이 등록할 수 있습니다.
          </p>
        ) : (
          <div className="incident-checklist">
            {serviceOptions.map((service) => (
              <label
                key={service.id}
                className="flex min-w-0 items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={values.serviceIds.includes(service.id)}
                  onChange={(event) =>
                    set({
                      serviceIds: event.target.checked
                        ? [...values.serviceIds, service.id]
                        : values.serviceIds.filter(
                            (serviceId) => serviceId !== service.id,
                          ),
                    })
                  }
                />
                <span className="truncate">{service.name}</span>
                <span className="text-xs text-muted">
                  {service.key}
                  {service.archived ? ", 아카이브" : ""}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <Field
        id={`${id}-summary`}
        label="요약"
        hint="Discord에는 보내지 않습니다."
      >
        <Textarea
          id={`${id}-summary`}
          value={values.summary}
          maxLength={2000}
          aria-describedby={`${id}-summary-hint`}
          onChange={(event) => set({ summary: event.target.value })}
        />
      </Field>
      {save.error ? (
        <p role="alert" className="text-sm text-danger">
          {incidentErrorMessage(save.error)}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={save.isPending} onClick={onClose}>
          취소
        </Button>
        <Button type="submit" loading={save.isPending}>
          {incident ? "저장" : "등록"}
        </Button>
      </div>
    </form>
  );
}
