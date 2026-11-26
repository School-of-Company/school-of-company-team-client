"use client";
import { useId, useState } from "react";
import {
  experimentApi,
  experimentErrorMessage,
  type Experiment,
} from "@/entities/experiment";
import { useExperimentMutation } from "@/features/manage-experiment";
import { Button, Markdown, Textarea } from "@/shared/ui";

export function Section({
  title,
  body,
  empty,
  onWrite,
}: {
  readonly title: string;
  readonly body: string;
  readonly empty?: string;
  readonly onWrite?: () => void;
}) {
  return (
    <section>
      <h2 className="task-section-title">{title}</h2>
      {body.trim() ? (
        <Markdown>{body}</Markdown>
      ) : (
        <p className="lab-empty text-sm text-muted">
          {empty}
          {onWrite && (
            <button type="button" className="ui-link-button" onClick={onWrite}>
              쓰기
            </button>
          )}
        </p>
      )}
    </section>
  );
}

export function EditableSection({
  experiment,
  field,
  title,
  empty,
}: {
  readonly experiment: Experiment;
  readonly field: "result" | "learnings";
  readonly title: string;
  readonly empty: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const save = useExperimentMutation((value: string) =>
    experimentApi.update(experiment.id, { [field]: value }),
  );
  const value = experiment[field];
  if (draft === null)
    return (
      <section>
        <div className="flex items-center justify-between gap-2">
          <h2 className="task-section-title">{title}</h2>
          {experiment.canEdit && value.trim() && (
            <button
              type="button"
              className="ui-link-button"
              onClick={() => setDraft(value)}
            >
              고치기
            </button>
          )}
        </div>
        {value.trim() ? (
          <Markdown>{value}</Markdown>
        ) : (
          <p className="lab-empty text-sm text-muted">
            {empty}
            {experiment.canEdit && (
              <button
                type="button"
                className="ui-link-button"
                onClick={() => setDraft(value)}
              >
                쓰기
              </button>
            )}
          </p>
        )}
      </section>
    );
  return (
    <section className="grid gap-2">
      <label htmlFor={`${id}-text`} className="task-section-title">
        {title}
      </label>
      <Textarea
        id={`${id}-text`}
        value={draft}
        autoFocus
        onChange={(event) => setDraft(event.target.value)}
      />
      <p className="text-xs text-muted">마크다운을 쓸 수 있어요.</p>
      {save.isError && (
        <p role="alert" className="text-sm text-danger">
          {experimentErrorMessage(save.error)}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          className="ui-button-sm"
          loading={save.isPending}
          onClick={() =>
            save.mutate(draft, { onSuccess: () => setDraft(null) })
          }
        >
          저장
        </Button>
        <Button
          variant="ghost"
          className="ui-button-sm"
          disabled={save.isPending}
          onClick={() => setDraft(null)}
        >
          취소
        </Button>
      </div>
    </section>
  );
}
