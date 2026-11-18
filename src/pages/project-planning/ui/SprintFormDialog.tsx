"use client";

import { useId, useState, type FormEvent } from "react";
import {
  sprintErrorMessage,
  type Sprint,
  type SprintInput,
} from "@/entities/sprint";
import { normalizeApiError } from "@/shared/api";
import { Button, Dialog, Field, Input, Textarea } from "@/shared/ui";
import { validateSprint } from "../model/validation";

/** Sprint 만들기·수정. 같은 양식이고 수정은 기존 값으로 채운다. */
export function SprintFormDialog({
  open,
  initial,
  defaults,
  onClose,
  onSubmit,
}: {
  readonly open: boolean;
  readonly initial?: Sprint;
  readonly defaults: { readonly startDate: string; readonly endDate: string };
  readonly onClose: () => void;
  readonly onSubmit: (input: SprintInput) => Promise<unknown>;
}) {
  const id = useId();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const input: SprintInput = {
      name: String(form.get("name") ?? "").trim(),
      goal: String(form.get("goal") ?? "").trim(),
      startDate: String(form.get("startDate") ?? ""),
      endDate: String(form.get("endDate") ?? ""),
    };
    const problems = validateSprint(input);
    setErrors(problems);
    if (Object.keys(problems).length) return;
    setPending(true);
    try {
      await onSubmit(input);
      onClose();
    } catch (cause) {
      setErrors({ form: sprintErrorMessage(normalizeApiError(cause)) });
    } finally {
      setPending(false);
    }
  }
  const describe = (key: string) =>
    errors[key]
      ? { "aria-invalid": true, "aria-describedby": `${id}-${key}-error` }
      : {};
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) onClose();
      }}
      title={initial ? "Sprint 수정" : "새 Sprint"}
    >
      {open && (
        <form onSubmit={submit} className="grid gap-5" noValidate>
          <Field id={`${id}-name`} label="이름 (필수)" error={errors.name}>
            <Input
              id={`${id}-name`}
              name="name"
              defaultValue={initial?.name}
              placeholder="11월 4주차"
              maxLength={100}
              required
              autoFocus
              {...describe("name")}
            />
          </Field>
          <Field id={`${id}-goal`} label="목표" error={errors.goal}>
            <Textarea
              id={`${id}-goal`}
              name="goal"
              defaultValue={initial?.goal ?? ""}
              maxLength={500}
              className="min-h-20"
              {...describe("goal")}
            />
          </Field>
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field
              id={`${id}-startDate`}
              label="시작일"
              error={errors.startDate}
            >
              <Input
                id={`${id}-startDate`}
                name="startDate"
                type="date"
                defaultValue={initial?.startDate ?? defaults.startDate}
                required
                {...describe("startDate")}
              />
            </Field>
            <Field id={`${id}-endDate`} label="종료일" error={errors.endDate}>
              <Input
                id={`${id}-endDate`}
                name="endDate"
                type="date"
                defaultValue={initial?.endDate ?? defaults.endDate}
                required
                {...describe("endDate")}
              />
            </Field>
          </div>
          {errors.form && (
            <p role="alert" className="text-sm text-danger">
              {errors.form}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              취소
            </Button>
            <Button type="submit" loading={pending}>
              {initial ? "변경 저장" : "Sprint 만들기"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
