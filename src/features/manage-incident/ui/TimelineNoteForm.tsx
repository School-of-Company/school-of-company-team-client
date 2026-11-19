"use client";

import { useId, useState, type FormEvent } from "react";
import {
  fromLocalInput,
  incidentApi,
  incidentErrorMessage,
} from "@/entities/incident";
import { Button, Input, Textarea } from "@/shared/ui";
import { useIncidentMutation } from "../api/mutations";

/** 대응 중 기록은 여러 사람이 남긴다: 메모는 활성 팀원 누구나 쓴다(D7-5). 지난 일을 나중에 적을 때만 시각을 고른다. */
export function TimelineNoteForm({
  incidentId,
}: {
  readonly incidentId: string;
}) {
  const id = useId();
  const [body, setBody] = useState("");
  const [at, setAt] = useState("");
  const [backdated, setBackdated] = useState(false);
  const add = useIncidentMutation(incidentId, () =>
    incidentApi.addNote(incidentId, {
      body: body.trim(),
      occurredAt: backdated ? fromLocalInput(at) : undefined,
    }),
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (add.isPending || !body.trim()) return;
    add.mutate(undefined, {
      onSuccess: () => {
        setBody("");
        setAt("");
        setBackdated(false);
      },
    });
  };
  return (
    <form className="incident-note-form" onSubmit={submit}>
      <label htmlFor={`${id}-body`} className="sr-only">
        타임라인 메모
      </label>
      <Textarea
        id={`${id}-body`}
        value={body}
        maxLength={2000}
        rows={2}
        className="min-h-16"
        placeholder="확인한 사실이나 한 조치를 적으세요"
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey))
            event.currentTarget.form?.requestSubmit();
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {backdated ? (
          <span className="flex flex-wrap items-center gap-2">
            <label htmlFor={`${id}-at`} className="text-sm text-muted">
              일어난 시각
            </label>
            <Input
              id={`${id}-at`}
              type="datetime-local"
              className="incident-note-time"
              value={at}
              onChange={(event) => setAt(event.target.value)}
            />
            <Button
              variant="ghost"
              className="ui-button-sm"
              onClick={() => {
                setBackdated(false);
                setAt("");
              }}
            >
              지금으로
            </Button>
          </span>
        ) : (
          <Button
            variant="ghost"
            className="ui-button-sm"
            onClick={() => setBackdated(true)}
          >
            시각 지정
          </Button>
        )}
        <Button
          type="submit"
          variant="secondary"
          className="ui-button-sm"
          loading={add.isPending}
          disabled={!body.trim()}
        >
          메모 추가
        </Button>
      </div>
      {add.error ? (
        <p role="alert" className="text-sm text-danger">
          {incidentErrorMessage(add.error)}
        </p>
      ) : null}
    </form>
  );
}

/** 지울 수 있는 것은 NOTE 뿐이고 고칠 수는 없다(지우고 다시 쓴다, D7-4). */
export function useRemoveNote(incidentId: string) {
  return useIncidentMutation(incidentId, (entryId: string) =>
    incidentApi.removeNote(incidentId, entryId),
  );
}
