"use client";

import { useId, useState, type FormEvent } from "react";
import {
  incidentApi,
  incidentErrorMessage,
  incidentStatuses,
  incidentStatusLabels,
  type IncidentDetail,
  type IncidentStatus,
} from "@/entities/incident";
import { fieldErrors, normalizeApiError } from "@/shared/api";
import { Button, DateTimePicker, Dialog, Field, Input } from "@/shared/ui";
import { useIncidentMutation } from "../api/mutations";

/** 지금 상태에서 다음으로 가장 흔한 변경. 상세 머리의 주요 버튼이 이것을 연다. */
export const nextStatus: Readonly<Record<IncidentStatus, IncidentStatus>> = {
  OPEN: "MITIGATED",
  MITIGATED: "RESOLVED",
  RESOLVED: "OPEN",
};
export const nextStatusAction: Readonly<Record<IncidentStatus, string>> = {
  OPEN: "완화됨으로 변경",
  MITIGATED: "해결됨으로 변경",
  RESOLVED: "다시 열기",
};

/** 상태는 세 값 사이를 자유롭게 오간다(재발 = 해결됨 → 대응 중, D7-3). 시각과 메모는 타임라인 STATUS 항목이 된다. */
export function IncidentStatusDialog({
  incident,
  initialStatus,
  open,
  onClose,
}: {
  readonly incident: IncidentDetail;
  readonly initialStatus: IncidentStatus;
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="상태 변경">
      {open && (
        <StatusForm
          incident={incident}
          initialStatus={initialStatus}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

function StatusForm({
  incident,
  initialStatus,
  onClose,
}: {
  readonly incident: IncidentDetail;
  readonly initialStatus: IncidentStatus;
  readonly onClose: () => void;
}) {
  const id = useId();
  const [status, setStatus] = useState<IncidentStatus>(initialStatus);
  const [at, setAt] = useState("");
  const [note, setNote] = useState("");
  const change = useIncidentMutation(incident.id, () =>
    incidentApi.changeStatus(incident.id, {
      status,
      at: at || undefined,
      note: note.trim() || undefined,
    }),
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (change.isPending) return;
    change.mutate(undefined, { onSuccess: onClose });
  };
  const same = status === incident.status;
  const server = change.error
    ? fieldErrors(
        normalizeApiError(change.error),
        ["at", "note"],
        incidentErrorMessage(change.error),
      )
    : {};
  return (
    <form className="grid gap-5" onSubmit={submit}>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">새 상태</legend>
        <div className="ui-segmented justify-self-start">
          {incidentStatuses.map((value) => (
            <label key={value} className="ui-segmented-option">
              <input
                type="radio"
                name={`${id}-status`}
                value={value}
                checked={status === value}
                onChange={() => setStatus(value)}
              />
              {incidentStatusLabels[value]}
            </label>
          ))}
        </div>
        {same && <p className="text-sm text-muted">지금 상태와 같습니다.</p>}
      </fieldset>
      <Field
        id={`${id}-at`}
        label="변경 시각"
        hint="비우면 지금으로 기록합니다. 시작 시각보다 이를 수 없습니다."
        error={server.at}
      >
        <DateTimePicker
          id={`${id}-at`}
          label="변경 시각"
          value={at}
          min={incident.startedAt}
          invalid={!!server.at}
          describedBy={`${id}-at-hint`}
          onChange={setAt}
        />
      </Field>
      <Field id={`${id}-note`} label="메모" error={server.note}>
        <Input
          id={`${id}-note`}
          value={note}
          maxLength={500}
          placeholder="예: OAuth 앱 비밀값 교체로 복구"
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      {server.form ? (
        <p role="alert" className="text-sm text-danger">
          {server.form}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          disabled={change.isPending}
          onClick={onClose}
        >
          취소
        </Button>
        <Button type="submit" loading={change.isPending} disabled={same}>
          {incidentStatusLabels[status]}으로 변경
        </Button>
      </div>
    </form>
  );
}
