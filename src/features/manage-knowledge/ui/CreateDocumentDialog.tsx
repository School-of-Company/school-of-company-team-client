"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { routes } from "@/shared/config";
import {
  kindDescriptions,
  kindLabels,
  knowledgeApi,
  knowledgeErrorMessage,
  knowledgeKinds,
  type KnowledgeDetail,
  type KnowledgeKind,
} from "@/entities/knowledge";
import { Button, Dialog, Field, Input } from "@/shared/ui";
import { useKnowledgeMutation } from "../api/mutations";

/**
 * 문서 만들기. 활성 팀원 누구나. 초안으로 만들어지고 본문은 종류별 기본 템플릿으로 시작한다(D7-9).
 * 서비스·사고 화면에서 열면 그 대상과의 "참고" 관계를 같은 요청으로 만든다.
 */
export function CreateDocumentDialog({
  open,
  onClose,
  onCreated,
  kind: fixedKind,
  serviceIds,
  incidentId,
  projectId,
  context,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onCreated: (document: KnowledgeDetail) => void;
  /** 정하면 종류를 고르지 않는다(서비스 화면의 Runbook 만들기). */
  readonly kind?: KnowledgeKind;
  readonly serviceIds?: readonly string[];
  readonly incidentId?: string;
  readonly projectId?: string;
  /** 만들면서 연결할 대상 설명. 예: "팀 서버 서비스에 연결합니다." */
  readonly context?: string;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={fixedKind ? `${kindLabels[fixedKind]} 만들기` : "문서 만들기"}
      className="incident-dialog"
    >
      {open && (
        <CreateForm
          fixedKind={fixedKind}
          serviceIds={serviceIds}
          incidentId={incidentId}
          projectId={projectId}
          context={context}
          onClose={onClose}
          onCreated={onCreated}
        />
      )}
    </Dialog>
  );
}

function CreateForm({
  fixedKind,
  serviceIds,
  incidentId,
  projectId,
  context,
  onClose,
  onCreated,
}: {
  readonly fixedKind?: KnowledgeKind;
  readonly serviceIds?: readonly string[];
  readonly incidentId?: string;
  readonly projectId?: string;
  readonly context?: string;
  readonly onClose: () => void;
  readonly onCreated: (document: KnowledgeDetail) => void;
}) {
  const router = useRouter();
  const id = useId();
  const [kind, setKind] = useState<KnowledgeKind | "">(fixedKind ?? "");
  const [title, setTitle] = useState("");
  const [errors, setErrors] = useState<{ kind?: string; title?: string }>({});
  const create = useKnowledgeMutation(() =>
    knowledgeApi.create({
      kind: kind || "ADR",
      title: title.trim(),
      serviceIds: serviceIds ?? [],
      incidentId,
      projectId,
    }),
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (create.isPending) return;
    const next: typeof errors = {};
    if (!kind) next.kind = "종류를 고르세요.";
    if (!title.trim()) next.title = "제목을 입력하세요.";
    else if (title.trim().length > 200)
      next.title = "제목은 200자까지 쓸 수 있어요.";
    setErrors(next);
    if (Object.keys(next).length) return;
    create.mutate(undefined, {
      onSuccess: (document) => {
        onCreated(document);
        router.push(`${routes.doc(document.id)}?edit=true`);
      },
    });
  };
  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      {!fixedKind && (
        <fieldset
          className="grid gap-2"
          aria-describedby={errors.kind ? `${id}-kind-error` : undefined}
        >
          <legend className="mb-2 text-sm font-medium">종류</legend>
          <div className="knowledge-kind-options">
            {knowledgeKinds.map((value) => (
              <label key={value} className="incident-severity-option">
                <input
                  type="radio"
                  name={`${id}-kind`}
                  value={value}
                  checked={kind === value}
                  onChange={() => setKind(value)}
                />
                <span className="font-medium">{kindLabels[value]}</span>
                <span className="text-xs text-muted">
                  {kindDescriptions[value]}
                </span>
              </label>
            ))}
          </div>
          {errors.kind && (
            <p
              id={`${id}-kind-error`}
              role="alert"
              className="text-sm text-danger"
            >
              {errors.kind}
            </p>
          )}
        </fieldset>
      )}
      <Field id={`${id}-title`} label="제목" error={errors.title}>
        <Input
          id={`${id}-title`}
          value={title}
          maxLength={200}
          required
          autoFocus
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? `${id}-title-error` : undefined}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <p className="text-sm text-muted">
        초안으로 만들고 본문은 종류별 기본 목차로 시작해요.
        {context ? ` ${context}` : ""}
      </p>
      {create.error ? (
        <p role="alert" className="text-sm text-danger">
          {knowledgeErrorMessage(create.error)}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          disabled={create.isPending}
          onClick={onClose}
        >
          취소
        </Button>
        <Button type="submit" loading={create.isPending}>
          만들기
        </Button>
      </div>
    </form>
  );
}
