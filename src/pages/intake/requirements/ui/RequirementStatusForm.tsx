"use client";
import { useId, useState } from "react";
import {
  reasonRequired,
  requirementApi,
  requirementErrorMessage,
  requirementStatusLabels,
  teamStatusTargets,
  type RequirementDetail,
  type RequirementStatus,
} from "@/entities/requirement";
import { Button, Field, Select, Textarea, useToast } from "@/shared/ui";
import { useRequirementChange } from "../api/change";

export function RequirementStatusForm({
  requirement,
  onSaved,
}: {
  readonly requirement: RequirementDetail;
  readonly onSaved: () => void;
}) {
  const id = useId();
  const toast = useToast();
  const targets = teamStatusTargets(requirement.status);
  const [status, setStatus] = useState<RequirementStatus>(requirement.status);
  const [reason, setReason] = useState(requirement.statusReason ?? "");
  const [error, setError] = useState<string | null>(null);
  const change = useRequirementChange(
    requirement.id,
    (input: { status: RequirementStatus; reason?: string }) =>
      requirementApi.changeStatus(requirement.id, input),
  );
  if (targets.length === 0)
    return (
      <p className="text-sm text-muted">
        {requirementStatusLabels[requirement.status]} 상태는 바꿀 수 없습니다.
      </p>
    );
  const needsReason = reasonRequired(status);
  return (
    <form
      noValidate
      className="grid gap-3"
      aria-labelledby={`${id}-title`}
      onSubmit={(event) => {
        event.preventDefault();
        const text = reason.trim();
        if (needsReason && !text) {
          setError("보류, 반려에는 사유가 필요합니다. 요청자에게 보입니다.");
          return;
        }
        if (text.length > 1000) {
          setError("사유는 1000자 이하입니다.");
          return;
        }
        if (change.isPending) return;
        change.mutate(
          { status, ...(text ? { reason: text } : {}) },
          {
            onSuccess: () => {
              setError(null);
              toast("상태를 바꿨습니다.", "success");
              onSaved();
            },
            onError: (problem) => setError(requirementErrorMessage(problem)),
          },
        );
      }}
    >
      <h2 id={`${id}-title`} className="text-sm font-semibold">
        상태 변경
      </h2>
      <Select
        aria-label="새 상태"
        value={status}
        onChange={(event) => setStatus(event.target.value as RequirementStatus)}
      >
        {targets.map((value) => (
          <option key={value} value={value}>
            {requirementStatusLabels[value]}
          </option>
        ))}
      </Select>
      <Field
        id={`${id}-reason`}
        label={needsReason ? "사유 (필수)" : "사유"}
        hint="요청자 상태 페이지에 보여요. 비우면 지워져요."
        error={error ?? undefined}
      >
        <Textarea
          id={`${id}-reason`}
          maxLength={1000}
          className="min-h-20"
          value={reason}
          aria-invalid={!!error || undefined}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      <div>
        <Button type="submit" loading={change.isPending}>
          저장
        </Button>
      </div>
    </form>
  );
}
