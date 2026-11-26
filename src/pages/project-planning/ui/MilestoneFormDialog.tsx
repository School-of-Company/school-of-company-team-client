import { useId, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { kindLabels, knowledgeQueries } from "@/entities/knowledge";
import {
  MILESTONE_GOAL_MAX,
  milestoneErrorMessage,
  milestoneInput,
  milestoneStatusLabels,
  milestoneStatuses,
  validateMilestone,
  type Milestone,
  type MilestoneInput,
  type MilestoneStatus,
} from "@/entities/milestone";
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
import { SprintGoalEditor } from "./SprintGoalEditor";

const blank: MilestoneInput = {
  name: "",
  description: "",
  goal: "",
  specDocumentId: "",
  startDate: "",
  dueDate: "",
  statusOverride: "",
  releaseRepositoryId: "",
  releaseTag: "",
};

/** 만들기와 수정. 상태 수동 지정은 수정에서만(생성 요청에는 없다, 계약 4.2). Release 연결은 상세에서 한다. */
export function MilestoneFormDialog({
  projectId,
  title,
  submitLabel,
  initial,
  onClose,
  onSubmit,
}: {
  readonly projectId: string;
  readonly title: string;
  readonly submitLabel: string;
  readonly initial?: Milestone;
  readonly onClose: () => void;
  readonly onSubmit: (input: MilestoneInput) => Promise<unknown>;
}) {
  const id = useId();
  const start = initial ? milestoneInput(initial) : blank;
  const [values, setValues] = useState(start);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const set = <K extends keyof MilestoneInput>(
    key: K,
    value: MilestoneInput[K],
  ) => setValues((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const input = { ...values, name: values.name.trim() };
    const problems = validateMilestone(input);
    setErrors(problems);
    if (Object.keys(problems).length) return;
    setPending(true);
    try {
      await onSubmit(input);
      onClose();
    } catch (cause) {
      const problem = normalizeApiError(cause);
      setErrors(
        problem.code === "DUPLICATE_MILESTONE_NAME"
          ? { name: milestoneErrorMessage(problem) }
          : problem.code === "MILESTONE_SPEC_DOCUMENT_INVALID"
            ? { specDocumentId: milestoneErrorMessage(problem) }
            : fieldErrors(
                problem,
                ["name", "description", "goal", "startDate", "dueDate"],
                milestoneErrorMessage(problem),
              ),
      );
    } finally {
      setPending(false);
    }
  }
  const describe = (key: string, hint = false) =>
    errors[key] ? `${id}-${key}-error` : hint ? `${id}-${key}-hint` : undefined;
  return (
    <Dialog
      open
      onClose={() => {
        if (!pending) onClose();
      }}
      title={title}
      className="milestone-panel"
    >
      <form onSubmit={submit} className="grid gap-5" noValidate>
        <Field id={`${id}-name`} label="이름 (필수)" error={errors.name}>
          <Input
            id={`${id}-name`}
            name="name"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder="베타 출시"
            maxLength={100}
            required
            autoFocus
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describe("name")}
          />
        </Field>
        <SprintGoalEditor
          id={`${id}-goal`}
          value={values.goal}
          onChange={(value) => set("goal", value)}
          error={errors.goal}
          max={MILESTONE_GOAL_MAX}
          hint="마크다운을 쓸 수 있어요."
        />
        <SpecDocumentField
          id={`${id}-spec`}
          projectId={projectId}
          value={values.specDocumentId}
          current={initial?.specDocument ?? null}
          error={errors.specDocumentId}
          onChange={(value) => set("specDocumentId", value)}
        />
        <div className="milestone-form-dates">
          <Field id={`${id}-startDate`} label="시작일" error={errors.startDate}>
            <DatePicker
              id={`${id}-startDate`}
              name="startDate"
              label="시작일"
              value={values.startDate}
              max={values.dueDate || undefined}
              onChange={(value) => set("startDate", value)}
              invalid={!!errors.startDate}
            />
          </Field>
          <Field id={`${id}-dueDate`} label="마감일" error={errors.dueDate}>
            <DatePicker
              id={`${id}-dueDate`}
              name="dueDate"
              label="마감일"
              value={values.dueDate}
              min={values.startDate || undefined}
              onChange={(value) => set("dueDate", value)}
              invalid={!!errors.dueDate}
            />
          </Field>
        </div>
        {initial && (
          <StatusOverrideField
            id={`${id}-status`}
            value={values.statusOverride}
            autoStatus={initial.autoStatus}
            onChange={(value) => set("statusOverride", value)}
          />
        )}
        <Field
          id={`${id}-description`}
          label="설명"
          error={errors.description}
          hint="마크다운을 쓸 수 있어요."
        >
          <Textarea
            id={`${id}-description`}
            name="description"
            value={values.description}
            onChange={(event) => set("description", event.target.value)}
            maxLength={5000}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={describe("description", true)}
          />
        </Field>
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
            {submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** 이 프로젝트 문서와 내가 볼 수 있는 조직 문서(계약 D15-h). */
function SpecDocumentField({
  id,
  projectId,
  value,
  current,
  error,
  onChange,
}: {
  readonly id: string;
  readonly projectId: string;
  readonly value: string;
  readonly current: Milestone["specDocument"];
  readonly error?: string;
  readonly onChange: (value: string) => void;
}) {
  const project = useQuery(knowledgeQueries.list({ projectId }));
  const org = useQuery(knowledgeQueries.list({ scope: "ORG" }));
  const known = [...(project.data ?? []), ...(org.data ?? [])];
  const loading = project.isPending || org.isPending;
  return (
    <Field
      id={id}
      label="기획 문서"
      error={error}
      hint={
        project.isError || org.isError
          ? "문서 목록을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요."
          : "이 프로젝트나 조직의 문서를 하나 골라요."
      }
    >
      <Select
        id={id}
        name="specDocumentId"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : `${id}-hint`}
        aria-busy={loading || undefined}
      >
        <option value="">없음</option>
        {current && !known.some((doc) => doc.id === current.id) && (
          <option value={current.id}>{current.title}</option>
        )}
        {!!project.data?.length && (
          <optgroup label="이 프로젝트 문서">
            {project.data.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {kindLabels[doc.kind]} {doc.title}
              </option>
            ))}
          </optgroup>
        )}
        {!!org.data?.length && (
          <optgroup label="조직 문서">
            {org.data.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {kindLabels[doc.kind]} {doc.title}
              </option>
            ))}
          </optgroup>
        )}
      </Select>
    </Field>
  );
}

/** 자동(업무, 마감일, 릴리스로 계산) 또는 수동. 고른 이유가 보이게 지금의 자동 계산 값을 함께 쓴다. */
function StatusOverrideField({
  id,
  value,
  autoStatus,
  onChange,
}: {
  readonly id: string;
  readonly value: MilestoneStatus | "";
  readonly autoStatus: MilestoneStatus;
  readonly onChange: (value: MilestoneStatus | "") => void;
}) {
  const auto = milestoneStatusLabels[autoStatus];
  return (
    <Field
      id={id}
      label="상태"
      hint={
        value
          ? `자동 계산 대신 이 상태를 써요. 자동이면 지금은 ${auto}예요.`
          : `업무 진행, 마감일, 릴리스로 계산해요. 지금은 ${auto}예요.`
      }
    >
      <Select
        id={id}
        name="statusOverride"
        value={value}
        onChange={(event) =>
          onChange(event.target.value as MilestoneStatus | "")
        }
        aria-describedby={`${id}-hint`}
      >
        <option value="">자동 ({auto})</option>
        {milestoneStatuses.map((status) => (
          <option key={status} value={status}>
            수동: {milestoneStatusLabels[status]}
          </option>
        ))}
      </Select>
    </Field>
  );
}
