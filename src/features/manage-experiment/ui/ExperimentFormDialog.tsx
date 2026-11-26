"use client";

import { useId, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  experimentApi,
  experimentErrorMessage,
  type Experiment,
} from "@/entities/experiment";
import { activeUsersQueryOptions } from "@/entities/user";
import { fieldErrors, normalizeApiError } from "@/shared/api";
import {
  Button,
  DatePicker,
  Dialog,
  Field,
  Input,
  Select,
  Textarea,
} from "@/shared/ui";
import { useExperimentMutation } from "../api/mutations";

/**
 * 실험 만들기·고치기. 가설은 필수, 방법·측정 기준은 나중에 채워도 된다.
 * 결과·배운 점은 끝날 때 상세 화면에서 쓴다.
 */
export function ExperimentFormDialog({
  open,
  experiment,
  currentUserId,
  onClose,
  onSaved,
}: {
  readonly open: boolean;
  /** 없으면 새 실험을 만든다. */
  readonly experiment?: Experiment;
  readonly currentUserId: string;
  readonly onClose: () => void;
  readonly onSaved: (experiment: Experiment) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={experiment ? "실험 고치기" : "새 실험"}
      className="incident-dialog"
    >
      {open && (
        <ExperimentForm
          experiment={experiment}
          currentUserId={currentUserId}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Dialog>
  );
}

function ExperimentForm({
  experiment,
  currentUserId,
  onClose,
  onSaved,
}: {
  readonly experiment?: Experiment;
  readonly currentUserId: string;
  readonly onClose: () => void;
  readonly onSaved: (experiment: Experiment) => void;
}) {
  const id = useId();
  const users = useQuery(activeUsersQueryOptions());
  const [title, setTitle] = useState(experiment?.title ?? "");
  const [hypothesis, setHypothesis] = useState(experiment?.hypothesis ?? "");
  const [method, setMethod] = useState(experiment?.method ?? "");
  const [metric, setMetric] = useState(experiment?.metric ?? "");
  const [ownerId, setOwnerId] = useState(
    experiment ? (experiment.owner?.id ?? "") : currentUserId,
  );
  const [startDate, setStartDate] = useState(experiment?.startDate ?? "");
  const [endDate, setEndDate] = useState(experiment?.endDate ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useExperimentMutation(() => {
    const body = {
      title: title.trim(),
      hypothesis: hypothesis.trim(),
      method,
      metric,
    };
    return experiment
      ? experimentApi.update(experiment.id, {
          ...body,
          ownerId: ownerId || null,
          startDate: startDate || null,
          endDate: endDate || null,
        })
      : experimentApi.create({
          ...body,
          ownerId: ownerId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
  });
  // 서버 검증 오류는 해당 칸 밑에, 나머지는 폼 아래에 보인다.
  const server = save.isError
    ? fieldErrors(
        normalizeApiError(save.error),
        ["title", "hypothesis", "startDate", "endDate"],
        experimentErrorMessage(save.error),
      )
    : {};
  const shown = { ...server, ...errors };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (save.isPending) return;
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "제목을 입력하세요.";
    else if (title.trim().length > 120)
      next.title = "제목은 120자까지 쓸 수 있습니다.";
    if (!hypothesis.trim()) next.hypothesis = "가설을 입력하세요.";
    if (startDate && endDate && endDate < startDate)
      next.endDate = "끝나는 날은 시작일보다 앞설 수 없습니다.";
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(undefined, { onSuccess: (saved) => saved && onSaved(saved) });
  };
  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <Field id={`${id}-title`} label="제목" error={shown.title}>
        <Input
          id={`${id}-title`}
          value={title}
          maxLength={120}
          required
          autoFocus
          placeholder="예: Bun으로 테스트 속도 줄이기"
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <Field
        id={`${id}-hypothesis`}
        label="가설"
        hint="무엇을 하면 어떻게 될지 한두 문장으로 적어요."
        error={shown.hypothesis}
      >
        <Textarea
          id={`${id}-hypothesis`}
          value={hypothesis}
          maxLength={2000}
          required
          className="min-h-20"
          placeholder="예: 테스트 실행기를 Bun으로 바꾸면 전체 테스트 시간이 절반 이하로 줄어든다."
          onChange={(event) => setHypothesis(event.target.value)}
        />
      </Field>
      <Field
        id={`${id}-metric`}
        label="측정 기준"
        hint="무엇을 보면 성공인지 적어요. 나중에 채워도 돼요."
      >
        <Textarea
          id={`${id}-metric`}
          value={metric}
          className="min-h-20"
          placeholder="예: CI 테스트 단계 시간 4분 → 2분 이하"
          onChange={(event) => setMetric(event.target.value)}
        />
      </Field>
      <Field
        id={`${id}-method`}
        label="해볼 것"
        hint="마크다운을 쓸 수 있어요."
      >
        <Textarea
          id={`${id}-method`}
          value={method}
          onChange={(event) => setMethod(event.target.value)}
        />
      </Field>
      <Field id={`${id}-owner`} label="담당자">
        <Select
          id={`${id}-owner`}
          value={ownerId}
          onChange={(event) => setOwnerId(event.target.value)}
        >
          <option value="">정하지 않음</option>
          {users.data?.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-start`} label="시작일" error={shown.startDate}>
          <DatePicker
            id={`${id}-start`}
            label="시작일"
            value={startDate}
            onChange={setStartDate}
            invalid={!!shown.startDate}
          />
        </Field>
        <Field id={`${id}-end`} label="끝나는 날" error={shown.endDate}>
          <DatePicker
            id={`${id}-end`}
            label="끝나는 날"
            value={endDate}
            onChange={setEndDate}
            min={startDate || undefined}
            invalid={!!shown.endDate}
          />
        </Field>
      </div>
      {shown.form && (
        <p role="alert" className="text-sm text-danger">
          {shown.form}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={save.isPending} onClick={onClose}>
          취소
        </Button>
        <Button type="submit" loading={save.isPending}>
          {experiment ? "저장" : "실험 만들기"}
        </Button>
      </div>
    </form>
  );
}
