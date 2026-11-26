"use client";

import { useId, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  knowledgeApi,
  knowledgeErrorMessage,
  knowledgeQueries,
} from "@/entities/knowledge";
import { Button, Dialog, Field, Select, Spinner } from "@/shared/ui";
import { useKnowledgeMutation } from "../api/mutations";

/** 업무 상세에서 기존 문서에 이 업무를 "참고"로 건다. 문서 편집 권한이 없으면 서버가 거절하고 그 이유를 보인다. */
export function LinkTaskDocument({
  taskId,
  linkedIds,
}: {
  readonly taskId: string;
  readonly linkedIds: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        className="ui-button-sm"
        onClick={() => setOpen(true)}
      >
        문서 연결
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="문서에 이 업무 연결"
        className="incident-dialog"
      >
        {open && (
          <LinkForm
            taskId={taskId}
            linkedIds={linkedIds}
            onClose={() => setOpen(false)}
          />
        )}
      </Dialog>
    </>
  );
}

function LinkForm({
  taskId,
  linkedIds,
  onClose,
}: {
  readonly taskId: string;
  readonly linkedIds: readonly string[];
  readonly onClose: () => void;
}) {
  const id = useId();
  const [documentId, setDocumentId] = useState("");
  const [error, setError] = useState("");
  const documents = useQuery(knowledgeQueries.list({}));
  const add = useKnowledgeMutation(() =>
    knowledgeApi.addLink(documentId, { taskId }),
  );
  const options = (documents.data ?? []).filter(
    (document) => !linkedIds.includes(document.id),
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (add.isPending) return;
    if (!documentId) {
      setError("문서를 고르세요.");
      return;
    }
    setError("");
    add.mutate(undefined, { onSuccess: onClose });
  };
  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      {documents.isPending ? (
        <Spinner label="문서 불러오는 중" />
      ) : documents.isError ? (
        <p role="alert" className="text-sm text-danger">
          {knowledgeErrorMessage(documents.error)}
        </p>
      ) : options.length === 0 ? (
        <p className="text-sm text-muted">연결할 수 있는 문서가 없어요.</p>
      ) : (
        <Field id={`${id}-doc`} label="문서" error={error}>
          <Select
            id={`${id}-doc`}
            value={documentId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-doc-error` : undefined}
            onChange={(event) => setDocumentId(event.target.value)}
          >
            <option value="" disabled>
              문서 선택
            </option>
            {options.map((document) => (
              <option key={document.id} value={document.id}>
                {document.kind} {document.title}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {add.error ? (
        <p role="alert" className="text-sm text-danger">
          {knowledgeErrorMessage(add.error)}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={add.isPending} onClick={onClose}>
          취소
        </Button>
        <Button
          type="submit"
          loading={add.isPending}
          disabled={options.length === 0}
        >
          연결
        </Button>
      </div>
    </form>
  );
}
