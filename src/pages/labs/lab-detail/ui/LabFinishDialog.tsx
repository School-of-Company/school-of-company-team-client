"use client";
import { useId, useState, type FormEvent } from "react";
import {
  experimentApi,
  experimentErrorMessage,
  experimentOutcomes,
  outcomeLabels,
  type Experiment,
  type ExperimentOutcome,
} from "@/entities/experiment";
import { useExperimentMutation } from "@/features/manage-experiment";
import { Button, Dialog, Field, Markdown, Textarea } from "@/shared/ui";

/** 진행 중인 실험을 끝낸다: 결과(성공·실패·판단 보류)는 필수, 결과·배운 점은 같이 적을 수 있다. */
export function FinishDialog({
  open,
  experiment,
  onClose,
}: {
  readonly open: boolean;
  readonly experiment: Experiment;
  readonly onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="결과 정리하기"
      className="incident-dialog"
    >
      {open && <FinishForm experiment={experiment} onClose={onClose} />}
    </Dialog>
  );
}

function FinishForm({
  experiment,
  onClose,
}: {
  readonly experiment: Experiment;
  readonly onClose: () => void;
}) {
  const id = useId();
  const [outcome, setOutcome] = useState<ExperimentOutcome | "">("");
  const [result, setResult] = useState(experiment.result);
  const [learnings, setLearnings] = useState(experiment.learnings);
  const [error, setError] = useState("");
  const finish = useExperimentMutation(async (chosen: ExperimentOutcome) => {
    await experimentApi.update(experiment.id, { result, learnings });
    return experimentApi.changeStatus(experiment.id, {
      status: "DONE",
      outcome: chosen,
    });
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (finish.isPending) return;
    if (!outcome) {
      setError("결과를 골라 주세요.");
      return;
    }
    setError("");
    finish.mutate(outcome, { onSuccess: onClose });
  };
  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      {experiment.metric.trim() && (
        <div className="lab-metric">
          <p className="task-section-title">측정 기준</p>
          <Markdown>{experiment.metric}</Markdown>
        </div>
      )}
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-semibold">결과</legend>
        <div className="flex flex-wrap gap-2">
          {experimentOutcomes.map((value) => (
            <label
              key={value}
              className="ui-priority-option"
              data-outcome={value}
            >
              <input
                type="radio"
                name={`${id}-outcome`}
                value={value}
                checked={outcome === value}
                onChange={() => setOutcome(value)}
              />
              {outcomeLabels[value]}
            </label>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </fieldset>
      <Field
        id={`${id}-result`}
        label="결과"
        hint="측정한 값과 있었던 일을 적어요."
      >
        <Textarea
          id={`${id}-result`}
          value={result}
          onChange={(event) => setResult(event.target.value)}
        />
      </Field>
      <Field id={`${id}-learnings`} label="배운 점">
        <Textarea
          id={`${id}-learnings`}
          value={learnings}
          className="min-h-20"
          onChange={(event) => setLearnings(event.target.value)}
        />
      </Field>
      {finish.isError && (
        <p role="alert" className="text-sm text-danger">
          {experimentErrorMessage(finish.error)}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          disabled={finish.isPending}
          onClick={onClose}
        >
          취소
        </Button>
        <Button type="submit" loading={finish.isPending}>
          실험 끝내기
        </Button>
      </div>
    </form>
  );
}
