"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  WHITEBOARD_TEMPLATE_DESCRIPTION_MAX,
  WHITEBOARD_TEMPLATE_NAME_MAX,
  whiteboardApi,
  templateErrorMessage,
  whiteboardKeys,
  whiteboardTemplateCategories,
  whiteboardTemplateCategoryLabels,
  type WhiteboardTemplate,
  type WhiteboardTemplateCategory,
} from "@/entities/whiteboard";
import { fieldErrors, normalizeApiError } from "@/shared/api";
import { Button, Dialog, Field, Input, Select, useToast } from "@/shared/ui";

type Mode =
  | {
      readonly kind: "create";
      readonly whiteboardId: string;
      /** 저장 안 된 변경이 있으면 이유를 적어 막는다(서버는 저장된 scene 을 복사한다). */
      readonly blocked?: string;
    }
  | { readonly kind: "edit"; readonly template: WhiteboardTemplate };

type Fields = "name" | "description";

/** 팀 템플릿 만들기(지금 화이트보드 복사) 또는 이름, 설명, 분류 바꾸기. LEAD 만 연다. */
export function TemplateFormDialog({
  open,
  mode,
  onClose,
}: {
  readonly open: boolean;
  readonly mode: Mode;
  readonly onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode.kind === "create" ? "팀 템플릿으로 저장" : "팀 템플릿 수정"}
    >
      {/* 열 때마다 처음 값으로 시작한다. */}
      {open && <TemplateForm mode={mode} onClose={onClose} />}
    </Dialog>
  );
}

function TemplateForm({
  mode,
  onClose,
}: {
  readonly mode: Mode;
  readonly onClose: () => void;
}) {
  const client = useQueryClient();
  const toast = useToast();
  const initial = mode.kind === "edit" ? mode.template : undefined;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<WhiteboardTemplateCategory>(
    initial?.category ?? "BASIC",
  );
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        description: description.trim(),
        category,
      };
      return mode.kind === "create"
        ? whiteboardApi.createTemplate({
            ...body,
            whiteboardId: mode.whiteboardId,
          })
        : whiteboardApi.updateTemplate(mode.template.id, body);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: whiteboardKeys.templates });
      toast(
        mode.kind === "create"
          ? "팀 템플릿으로 저장했습니다. 새 화이트보드를 만들 때 고를 수 있습니다."
          : "팀 템플릿을 고쳤습니다.",
        "success",
      );
      onClose();
    },
    onError: (failure) => {
      const { form, ...fields } = fieldErrors(
        normalizeApiError(failure),
        ["name", "description"],
        templateErrorMessage(failure),
      );
      setErrors(fields);
      if (form) toast(form, "error");
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    const next: Partial<Record<Fields, string>> = {};
    if (!name.trim()) next.name = "이름을 입력하세요.";
    if (!description.trim())
      next.description = "언제 쓰는 템플릿인지 한 줄로 적으세요.";
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate();
  }
  const blocked = mode.kind === "create" ? mode.blocked : undefined;
  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      {mode.kind === "create" && (
        <p className="text-sm text-muted">
          지금 저장된 내용을 복사합니다. 이후 이 화이트보드를 고쳐도 템플릿은
          그대로입니다. 팀원 모두가 볼 수 있습니다.
        </p>
      )}
      <Field id="template-name" label="이름" error={errors.name}>
        <Input
          id="template-name"
          value={name}
          maxLength={WHITEBOARD_TEMPLATE_NAME_MAX}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "template-name-error" : undefined}
        />
      </Field>
      <Field
        id="template-description"
        label="언제 쓰나요"
        error={errors.description}
      >
        <Input
          id="template-description"
          value={description}
          maxLength={WHITEBOARD_TEMPLATE_DESCRIPTION_MAX}
          placeholder="예: 주간 회의에서 안건과 결정을 정리할 때"
          onChange={(event) => setDescription(event.target.value)}
          aria-invalid={!!errors.description}
          aria-describedby={
            errors.description ? "template-description-error" : undefined
          }
        />
      </Field>
      <Field id="template-category" label="분류">
        <Select
          id="template-category"
          value={category}
          onChange={(event) =>
            setCategory(
              whiteboardTemplateCategories.find(
                (value) => value === event.target.value,
              ) ?? "BASIC",
            )
          }
        >
          {whiteboardTemplateCategories.map((value) => (
            <option key={value} value={value}>
              {whiteboardTemplateCategoryLabels[value]}
            </option>
          ))}
        </Select>
      </Field>
      {blocked && (
        <p role="status" className="text-sm text-muted">
          {blocked}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          취소
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={save.isPending}
          disabled={!!blocked}
        >
          저장
        </Button>
      </div>
    </form>
  );
}
