"use client";

import { useId, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  intakeFormApi,
  requirementErrorMessage,
  requirementKeys,
  requirementQueries,
  type IntakeForm,
  type SaveIntakeForm,
} from "@/entities/requirement";
import { fieldErrors, normalizeApiError } from "@/shared/api";
import { formatDate } from "@/shared/lib";
import {
  Badge,
  Button,
  Checkbox,
  DateTimePicker,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  InfoTip,
  Input,
  Skeleton,
  Textarea,
  useToast,
} from "@/shared/ui";

type Change =
  | { readonly action: "create"; readonly body: SaveIntakeForm }
  | {
      readonly action: "update";
      readonly formId: string;
      readonly body: SaveIntakeForm;
    }
  | { readonly action: "rotate"; readonly formId: string }
  | { readonly action: "delete"; readonly formId: string };

/**
 * 외부 요구사항 접수 링크 관리(6~11). projectId 가 null 이면 조직 단위(헤드 어드민).
 * 링크(`url`)는 양식 토큰을 담은 공개 주소다. 재발급하면 이전 링크는 즉시 열리지 않는다.
 */
export function IntakeFormSettings({
  projectId,
  editable,
}: {
  readonly projectId: string | null;
  readonly editable: boolean;
}) {
  const toast = useToast();
  const client = useQueryClient();
  const forms = useQuery(requirementQueries.forms(projectId));
  const [editing, setEditingForm] = useState<IntakeForm | "new" | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const setEditing = (next: IntakeForm | "new" | null) => {
    setServerErrors({});
    setEditingForm(next);
  };
  const [confirm, setConfirm] = useState<{
    readonly form: IntakeForm;
    readonly action: "rotate" | "delete";
  } | null>(null);
  const change = useMutation({
    mutationFn: async (input: Change) => {
      switch (input.action) {
        case "create":
          return intakeFormApi.create(projectId, input.body);
        case "update":
          return intakeFormApi.update(input.formId, input.body);
        case "rotate":
          return intakeFormApi.rotate(input.formId);
        case "delete":
          return intakeFormApi.remove(input.formId);
      }
    },
    onSuccess: () =>
      client.invalidateQueries({ queryKey: requirementKeys.forms(projectId) }),
  });
  const copy = (url: string) =>
    void navigator.clipboard.writeText(url).then(
      () => toast("링크를 복사했어요.", "success"),
      () => toast("복사하지 못했어요. 링크를 직접 선택해 복사하세요.", "error"),
    );

  if (forms.isPending)
    return (
      <div
        role="status"
        aria-label="접수 양식 불러오는 중"
        className="grid gap-2"
      >
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  if (forms.isError)
    return (
      <ErrorState
        description={requirementErrorMessage(forms.error)}
        onRetry={() => void forms.refetch()}
      />
    );
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1 text-sm text-muted">
          양식 {forms.data.length}개
          <InfoTip label="접수 양식 설명">
            링크만 있으면 로그인 없이 제출할 수 있어요.
            {projectId
              ? " 접수된 요청은 요구사항 탭에 쌓여요."
              : " 프로젝트가 없는 요청용이라 헤드 어드민만 봐요."}
          </InfoTip>
        </span>
        {editable && (
          <Button variant="secondary" onClick={() => setEditing("new")}>
            양식 만들기
          </Button>
        )}
      </div>
      {forms.data.length === 0 ? (
        <EmptyState
          title="접수 양식이 없어요"
          description="외주 문의, 요구사항을 받을 링크를 만들어 요청자에게 전달하세요."
        />
      ) : (
        <ul className="grid gap-3" aria-label="접수 양식">
          {forms.data.map((form) => (
            <li
              key={form.id}
              className="grid gap-3 rounded-xl bg-surface-box p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold wrap-anywhere">
                  {form.publicTitle}
                </span>
                {form.active ? (
                  <Badge className="badge-green">접수 중</Badge>
                ) : (
                  <Badge>꺼짐</Badge>
                )}
                {form.expiresAt &&
                  Date.parse(form.expiresAt) < forms.dataUpdatedAt && (
                    <Badge className="badge-red">만료</Badge>
                  )}
              </div>
              <p className="text-sm text-muted">
                하루 {form.dailyLimit}건,{" "}
                {form.expiresAt
                  ? `${formatDate(form.expiresAt, { hour: "2-digit", minute: "2-digit" })} 마감`
                  : "마감 없음"}
                {form.rotatedAt &&
                  `, ${formatDate(form.rotatedAt)} 링크 재발급`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Input
                  readOnly
                  aria-label={`${form.publicTitle} 공개 링크`}
                  value={form.url}
                  className="min-w-0 flex-1 font-mono text-xs"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button variant="secondary" onClick={() => copy(form.url)}>
                  복사
                </Button>
              </div>
              {editable && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    className="ui-button-sm"
                    onClick={() => setEditing(form)}
                  >
                    수정
                  </Button>
                  <Button
                    variant="ghost"
                    className="ui-button-sm"
                    onClick={() => setConfirm({ form, action: "rotate" })}
                  >
                    링크 재발급
                  </Button>
                  <Button
                    variant="ghost"
                    className="ui-button-sm"
                    onClick={() => setConfirm({ form, action: "delete" })}
                  >
                    삭제
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <FormDialog
        key={editing === "new" ? "new" : (editing?.id ?? "closed")}
        form={editing}
        pending={change.isPending}
        serverErrors={serverErrors}
        onClose={() => setEditing(null)}
        onSave={(body) => {
          setServerErrors({});
          change.mutate(
            editing === "new" || !editing
              ? { action: "create", body }
              : { action: "update", formId: editing.id, body },
            {
              onSuccess: () => {
                setEditing(null);
                toast(
                  editing === "new" ? "양식을 만들었어요." : "저장했어요.",
                  "success",
                );
              },
              // 서버 검증 오류는 해당 칸 밑에 보이고, 나머지는 알림으로 띄운다.
              onError: (error) => {
                const found = fieldErrors(
                  normalizeApiError(error),
                  [
                    "publicTitle",
                    "publicDescription",
                    "dailyLimit",
                    "expiresAt",
                  ],
                  requirementErrorMessage(error),
                );
                const { form, ...fields } = found;
                setServerErrors(fields);
                if (form) toast(form, "error");
              },
            },
          );
        }}
      />
      <Dialog
        open={!!confirm}
        onClose={() => {
          if (!change.isPending) setConfirm(null);
        }}
        title={
          confirm?.action === "rotate"
            ? "링크를 재발급할까요?"
            : "양식을 삭제할까요?"
        }
      >
        <p className="mb-6 text-sm text-muted">
          {confirm?.action === "rotate"
            ? "이전 링크는 바로 열리지 않아요. 이미 전달한 요청자에게 새 링크를 다시 보내야 해요."
            : "링크가 바로 닫혀요. 이미 받은 요구사항은 남아요. 되돌릴 수 없어요."}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            disabled={change.isPending}
            onClick={() => setConfirm(null)}
          >
            취소
          </Button>
          <Button
            variant="danger"
            loading={change.isPending}
            onClick={() =>
              confirm &&
              change.mutate(
                { action: confirm.action, formId: confirm.form.id },
                {
                  onSuccess: () => {
                    toast(
                      confirm.action === "rotate"
                        ? "새 링크를 만들었어요. 요청자에게 다시 전달하세요."
                        : "양식을 삭제했어요.",
                      "success",
                    );
                    setConfirm(null);
                  },
                  onError: (error) =>
                    toast(requirementErrorMessage(error), "error"),
                },
              )
            }
          >
            {confirm?.action === "rotate" ? "재발급" : "삭제"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function FormDialog({
  form,
  pending,
  serverErrors,
  onClose,
  onSave,
}: {
  readonly form: IntakeForm | "new" | null;
  readonly pending: boolean;
  /** 서버 필드 이름(publicTitle 등) → 메시지. */
  readonly serverErrors: Readonly<Record<string, string>>;
  readonly onClose: () => void;
  readonly onSave: (body: SaveIntakeForm) => void;
}) {
  const id = useId();
  const existing = form && form !== "new" ? form : null;
  const [title, setTitle] = useState(existing?.publicTitle ?? "");
  const [description, setDescription] = useState(
    existing?.publicDescription ?? "",
  );
  const [active, setActive] = useState(existing?.active ?? true);
  const [expiresAt, setExpiresAt] = useState(existing?.expiresAt ?? "");
  const [dailyLimit, setDailyLimit] = useState(
    String(existing?.dailyLimit ?? 50),
  );
  const [localErrors, setErrors] = useState<Record<string, string>>({});
  const errors = {
    title: serverErrors.publicTitle,
    description: serverErrors.publicDescription,
    dailyLimit: serverErrors.dailyLimit,
    expiresAt: serverErrors.expiresAt,
    ...localErrors,
  };
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    const limit = Number(dailyLimit);
    if (!title.trim() || title.trim().length > 100)
      found.title = "공개 제목은 1~100자예요.";
    if (description.length > 2000)
      found.description = "안내 문구는 2000자 이하예요.";
    if (!Number.isInteger(limit) || limit < 1 || limit > 500)
      found.dailyLimit = "하루 한도는 1~500건이에요.";
    if (expiresAt && Number.isNaN(Date.parse(expiresAt)))
      found.expiresAt = "날짜와 시각을 확인하세요.";
    setErrors(found);
    if (Object.keys(found).length || pending) return;
    onSave({
      publicTitle: title.trim(),
      publicDescription: description.trim() || null,
      active,
      dailyLimit: limit,
      ...(expiresAt
        ? { expiresAt }
        : existing?.expiresAt
          ? { clearExpiresAt: true }
          : {}),
    });
  };
  return (
    <Dialog
      open={form !== null}
      onClose={() => {
        if (!pending) onClose();
      }}
      title={existing ? "접수 양식 수정" : "접수 양식 만들기"}
    >
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        <Field id={`${id}-title`} label="공개 제목" error={errors.title}>
          <Input
            id={`${id}-title`}
            maxLength={100}
            value={title}
            aria-invalid={!!errors.title || undefined}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field
          id={`${id}-description`}
          label="안내 문구"
          hint="양식 맨 위에 보여요."
          error={errors.description}
        >
          <Textarea
            id={`${id}-description`}
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <Field
          id={`${id}-expires`}
          label="마감 시각"
          hint="비우면 마감 없이 받아요."
          error={errors.expiresAt}
        >
          <DateTimePicker
            id={`${id}-expires`}
            label="마감 시각"
            value={expiresAt}
            defaultTime="23:59"
            invalid={!!errors.expiresAt}
            describedBy={`${id}-expires-hint`}
            onChange={setExpiresAt}
          />
        </Field>
        <Field
          id={`${id}-limit`}
          label="하루 접수 한도"
          hint="1~500건, 한국 시각 자정에 초기화"
          error={errors.dailyLimit}
        >
          <Input
            id={`${id}-limit`}
            type="number"
            min={1}
            max={500}
            inputMode="numeric"
            value={dailyLimit}
            aria-invalid={!!errors.dailyLimit || undefined}
            onChange={(event) => setDailyLimit(event.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          접수 받기
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            취소
          </Button>
          <Button type="submit" loading={pending}>
            저장
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
