"use client";

import { useId, useState, type FormEvent } from "react";
import {
  knowledgeApi,
  knowledgeErrorMessage,
  knowledgeStatuses,
  knowledgeStatusLabels,
  type KnowledgeDetail,
  type KnowledgeStatus,
} from "@/entities/knowledge";
import {
  Button,
  Field,
  Input,
  Label,
  Markdown,
  Select,
  Textarea,
} from "@/shared/ui";
import { useKnowledgeMutation } from "../api/mutations";

/** 제목·본문 편집. 바뀐 값만 보낸다. 본문은 마크다운 원문이고 원문 HTML은 렌더링하지 않는다. */
export function DocumentEditor({
  document,
  onDone,
}: {
  readonly document: KnowledgeDetail;
  readonly onDone: () => void;
}) {
  const id = useId();
  const [title, setTitle] = useState(document.title);
  const [body, setBody] = useState(document.body);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [titleError, setTitleError] = useState("");
  const save = useKnowledgeMutation(() =>
    knowledgeApi.update(document.id, {
      title: title.trim() !== document.title ? title.trim() : undefined,
      body: body !== document.body ? body : undefined,
    }),
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (save.isPending) return;
    if (!title.trim()) {
      setTitleError("제목을 입력하세요.");
      return;
    }
    setTitleError("");
    save.mutate(undefined, { onSuccess: onDone });
  };
  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <Field id={`${id}-title`} label="제목" error={titleError}>
        <Input
          id={`${id}-title`}
          value={title}
          maxLength={200}
          required
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? `${id}-title-error` : undefined}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${id}-body`}>본문</Label>
          <div className="ui-segmented" role="group" aria-label="본문 보기">
            {(["write", "preview"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className="ui-segmented-option"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
              >
                {value === "write" ? "작성" : "미리보기"}
              </button>
            ))}
          </div>
        </div>
        {mode === "write" ? (
          <Textarea
            id={`${id}-body`}
            value={body}
            maxLength={100000}
            className="knowledge-body-input"
            onChange={(event) => setBody(event.target.value)}
          />
        ) : (
          <div id={`${id}-body`} className="postmortem-preview">
            {body.trim() ? (
              <Markdown>{body}</Markdown>
            ) : (
              <p className="text-sm text-muted">본문이 비어 있어요.</p>
            )}
          </div>
        )}
      </div>
      {save.error ? (
        <p role="alert" className="text-sm text-danger">
          {knowledgeErrorMessage(save.error)}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={save.isPending} onClick={onDone}>
          취소
        </Button>
        <Button type="submit" loading={save.isPending}>
          저장
        </Button>
      </div>
    </form>
  );
}

/** 상태는 초안·게시·폐기 세 개 사이를 자유롭게 오간다(D7-8). */
export function DocumentStatusSelect({
  document,
}: {
  readonly document: KnowledgeDetail;
}) {
  const id = useId();
  const change = useKnowledgeMutation((status: KnowledgeStatus) =>
    knowledgeApi.update(document.id, { status }),
  );
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="sr-only">
        문서 상태
      </label>
      <Select
        id={id}
        value={document.status}
        disabled={change.isPending}
        aria-busy={change.isPending || undefined}
        onChange={(event) => {
          const status = knowledgeStatuses.find(
            (value) => value === event.target.value,
          );
          if (status && !change.isPending) change.mutate(status);
        }}
      >
        {knowledgeStatuses.map((status) => (
          <option key={status} value={status}>
            {knowledgeStatusLabels[status]}
          </option>
        ))}
      </Select>
      {change.error ? (
        <p role="alert" className="text-xs text-danger">
          {knowledgeErrorMessage(change.error)}
        </p>
      ) : null}
    </div>
  );
}
