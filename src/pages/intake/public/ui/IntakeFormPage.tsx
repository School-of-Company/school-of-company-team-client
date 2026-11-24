"use client";

import { useId, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  buildSubmission,
  emptyDraft,
  fieldPath,
  publicIntakeApi,
  requesterFields,
  requirementErrorMessage,
  serverFieldErrors,
  StatusLinkOnce,
  validateIntake,
  type FieldErrors,
  type IntakeDraft,
  type PublicForm,
  type TemplateField,
} from "@/entities/requirement";
import { normalizeApiError } from "@/shared/api";
import {
  Badge,
  Button,
  Checkbox,
  ErrorState,
  Field,
  IconButton,
  Icon,
  Input,
  Select,
  Spinner,
  Textarea,
} from "@/shared/ui";


/** 공개 접수 양식(로그인 없음). 템플릿 항목은 서버가 내려 주는 대로 그린다(D12-2). */
export function IntakeFormPage({ formToken }: { readonly formToken: string }) {
  const form = useQuery({
    queryKey: ["public-intake-form", formToken],
    queryFn: () => publicIntakeApi.form(formToken),
    // 서명(issuedAt)이 바뀌지 않게 포커스·간격 갱신은 하지 않는다. 봇 판정에 걸리면 직접 다시 받는다.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    gcTime: 0,
  });
  const [statusToken, setStatusToken] = useState<string | null>(null);

  if (statusToken) return <Submitted token={statusToken} />;
  if (form.isPending) return <Spinner label="양식 불러오는 중" />;
  if (form.isError) {
    const problem = normalizeApiError(form.error);
    return (
      <ErrorState
        title={
          problem.status === 410
            ? "접수가 마감되었습니다"
            : problem.status === 404
              ? "양식을 찾을 수 없습니다"
              : "양식을 불러오지 못했습니다"
        }
        description={requirementErrorMessage(form.error)}
        onRetry={
          problem.status === 404 || problem.status === 410
            ? undefined
            : () => void form.refetch()
        }
      />
    );
  }
  return (
    <IntakeFormBody
      form={form.data}
      formToken={formToken}
      onReissue={() => void form.refetch()}
      onSubmitted={setStatusToken}
    />
  );
}

function IntakeFormBody({
  form,
  formToken,
  onReissue,
  onSubmitted,
}: {
  readonly form: PublicForm;
  readonly formToken: string;
  readonly onReissue: () => void;
  readonly onSubmitted: (token: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<IntakeDraft>(() => emptyDraft(form));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const submit = useMutation({
    mutationFn: () =>
      publicIntakeApi.submit(formToken, buildSubmission(form, draft)),
    onSuccess: (result) => onSubmitted(result.statusToken),
    onError: (error) => {
      const problem = normalizeApiError(error);
      if (problem.code === "VALIDATION_ERROR")
        setErrors(serverFieldErrors(problem.details));
      if (problem.code === "INTAKE_CONSENT_REQUIRED")
        setErrors({ consent: requirementErrorMessage(error) });
      // 서명이 만료됐거나 너무 빨랐다: 새 서명을 받고 다시 제출하게 한다(작성 내용은 그대로).
      if (problem.code === "INTAKE_TOO_FAST") onReissue();
      setNotice(requirementErrorMessage(error));
    },
  });
  const setValue = (key: string, value: string | readonly string[]) =>
    setDraft((current) => ({
      ...current,
      values: { ...current.values, [key]: value },
    }));
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (submit.isPending) return;
    const found = validateIntake(form, draft);
    setErrors(found);
    if (Object.keys(found).length) {
      setNotice("입력값을 확인하세요. 빨간 안내가 있는 항목을 고쳐 주세요.");
      return;
    }
    setNotice(null);
    submit.mutate();
  };
  const err = (path: string) => errors[path];

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-8">
      <header className="grid gap-2">
        <p className="text-sm text-muted">요구사항 접수</p>
        <h1 className="text-2xl font-bold break-words">{form.title}</h1>
        {form.description && (
          <p className="text-sm whitespace-pre-wrap text-foreground-2">
            {form.description}
          </p>
        )}
        <p className="text-sm text-muted">
          파일 첨부는 받지 않습니다. 자료는 링크로 남겨 주세요.
        </p>
      </header>

      <section className="grid gap-5" aria-labelledby={`${id}-req`}>
        <h2 id={`${id}-req`} className="text-lg font-semibold">
          요구사항
        </h2>
        {form.template.map((field) => (
          <TemplateInput
            key={field.key}
            id={`${id}-${field.key}`}
            field={field}
            form={form}
            value={draft.values[field.key]}
            errors={errors}
            onChange={(value) => setValue(field.key, value)}
          />
        ))}
      </section>

      <section className="grid gap-5" aria-labelledby={`${id}-who`}>
        <h2 id={`${id}-who`} className="text-lg font-semibold">
          요청자 정보
        </h2>
        <p className="text-sm text-muted">
          회신 연락에만 쓰며 PM과 헤드 어드민만 봅니다.
        </p>
        {requesterFields.map((field) => (
          <Field
            key={field.key}
            id={`${id}-r-${field.key}`}
            label={field.required ? `${field.label} (필수)` : field.label}
            error={err(`requester.${field.key}`)}
          >
            <Input
              id={`${id}-r-${field.key}`}
              type={field.type}
              maxLength={field.max}
              autoComplete={
                field.key === "name"
                  ? "name"
                  : field.key === "organization"
                    ? "organization"
                    : field.key
              }
              aria-invalid={!!err(`requester.${field.key}`) || undefined}
              aria-describedby={
                err(`requester.${field.key}`)
                  ? `${id}-r-${field.key}-error`
                  : undefined
              }
              value={draft.requester[field.key]}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  requester: {
                    ...current.requester,
                    [field.key]: event.target.value,
                  },
                }))
              }
            />
          </Field>
        ))}
      </section>

      <section className="grid gap-3" aria-labelledby={`${id}-consent`}>
        <h2
          id={`${id}-consent`}
          className="flex items-center gap-2 text-lg font-semibold"
        >
          개인정보 수집·이용 동의
          {form.consentReviewRequired && (
            <Badge className="badge-red">검토 필요</Badge>
          )}
        </h2>
        {form.consentReviewRequired && (
          <p role="note" className="text-sm text-muted">
            아래 문구는 개인정보 담당 확인 전 초안입니다.
          </p>
        )}
        <p className="rounded-xl bg-surface-box p-4 text-sm whitespace-pre-wrap">
          {form.consentText}
        </p>
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox
            checked={draft.consent}
            aria-invalid={!!err("consent") || undefined}
            aria-describedby={
              err("consent") ? `${id}-consent-error` : undefined
            }
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                consent: event.target.checked,
              }))
            }
          />
          위 내용에 동의합니다 (필수)
        </label>
        {err("consent") && (
          <p
            id={`${id}-consent-error`}
            role="alert"
            className="text-sm text-danger"
          >
            {err("consent")}
          </p>
        )}
      </section>

      {/* 숨은 입력란(봇 판정, D12-9). 사람에게는 보이지 않고 보조기기·Tab 순서에서도 빠진다. */}
      <div className="intake-trap" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Website</label>
        <input
          id={`${id}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={draft.website}
          onChange={(event) =>
            setDraft((current) => ({ ...current, website: event.target.value }))
          }
        />
      </div>

      {notice && (
        <p role="alert" className="text-sm text-danger">
          {notice}
        </p>
      )}
      <div>
        <Button type="submit" loading={submit.isPending}>
          제출
        </Button>
      </div>
    </form>
  );
}

function TemplateInput({
  id,
  field,
  form,
  value,
  errors,
  onChange,
}: {
  readonly id: string;
  readonly field: TemplateField;
  readonly form: PublicForm;
  readonly value: string | readonly string[] | undefined;
  readonly errors: FieldErrors;
  readonly onChange: (value: string | readonly string[]) => void;
}) {
  const path = fieldPath(field);
  const label = field.required ? `${field.label} (필수)` : field.label;
  const error = errors[path];
  const described =
    [field.help && `${id}-hint`, error && `${id}-error`]
      .filter(Boolean)
      .join(" ") || undefined;
  const common = {
    id,
    "aria-invalid": !!error || undefined,
    "aria-describedby": described,
  };
  const text = typeof value === "string" ? value : "";
  if (field.type === "LIST" || field.type === "URL_LIST") {
    const rows = Array.isArray(value) && value.length ? value : [""];
    const max = field.maxItems ?? 30;
    const rowErrors = rows
      .map((_, index) => errors[`references[${index}]`])
      .filter(Boolean);
    return (
      <fieldset className="grid gap-2" aria-describedby={described}>
        <legend className="mb-2 text-sm font-medium">{label}</legend>
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              id={index === 0 ? id : `${id}-${index}`}
              aria-label={`${field.label} ${index + 1}`}
              aria-invalid={
                !!(error || errors[`references[${index}]`]) || undefined
              }
              type={field.type === "URL_LIST" ? "url" : "text"}
              inputMode={field.type === "URL_LIST" ? "url" : undefined}
              placeholder={field.type === "URL_LIST" ? "https://" : undefined}
              maxLength={field.maxLength ?? undefined}
              value={row}
              onChange={(event) =>
                onChange(
                  rows.map((item, i) =>
                    i === index ? event.target.value : item,
                  ),
                )
              }
            />
            {rows.length > 1 && (
              <IconButton
                variant="ghost"
                aria-label={`${field.label} ${index + 1} 지우기`}
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
              >
                <Icon name="close" />
              </IconButton>
            )}
          </div>
        ))}
        {rows.length < max && (
          <div>
            <Button
              variant="secondary"
              className="ui-button-sm"
              onClick={() => onChange([...rows, ""])}
            >
              <Icon name="plus" className="inline-block" /> 항목 추가
            </Button>
          </div>
        )}
        {field.help && (
          <p id={`${id}-hint`} className="text-sm text-muted">
            {field.help} (최대 {max}개)
          </p>
        )}
        {(error || rowErrors.length > 0) && (
          <p id={`${id}-error`} role="alert" className="text-sm text-danger">
            {error ?? rowErrors[0]}
          </p>
        )}
      </fieldset>
    );
  }
  return (
    <Field id={id} label={label} hint={field.help ?? undefined} error={error}>
      {field.type === "SELECT" ? (
        <Select
          {...common}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">고르세요</option>
          {form.priorities.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ) : field.type === "DATE" ? (
        <Input
          {...common}
          type="date"
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : field.type === "LONG_TEXT" ? (
        <Textarea
          {...common}
          maxLength={field.maxLength ?? undefined}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          {...common}
          maxLength={field.maxLength ?? undefined}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

function Submitted({ token }: { readonly token: string }) {
  return (
    <section className="grid gap-5" aria-labelledby="intake-done">
      <h1 id="intake-done" className="text-2xl font-bold">
        요구사항이 접수되었습니다
      </h1>
      <p className="text-sm text-foreground-2">
        팀이 검토한 뒤 상태 페이지에 답변을 남깁니다. 진행 상황과 답변은 아래
        링크에서만 볼 수 있습니다.
      </p>
      <StatusLinkOnce token={token} />
    </section>
  );
}
