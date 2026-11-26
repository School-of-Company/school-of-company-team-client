"use client";

import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  knowledgeApi,
  knowledgeKeys,
  knowledgeErrorMessage,
  kindLabels,
  type KnowledgeTemplate,
} from "@/entities/knowledge";
import { formatDate } from "@/shared/lib";
import { Button, ErrorState, Markdown, Spinner, Textarea } from "@/shared/ui";

export function DocumentTemplates() {
  const templates = useQuery({
    queryKey: knowledgeKeys.templates,
    queryFn: knowledgeApi.templates,
  });
  return (
    <section
      aria-labelledby="document-templates-title"
      className="settings-card grid gap-5"
    >
      <div>
        <h2 id="document-templates-title">문서 템플릿</h2>
        <p className="text-sm text-muted">
          새 문서의 기본 본문입니다. 기존 문서는 바뀌지 않습니다.
        </p>
      </div>
      {templates.isPending ? (
        <Spinner label="문서 템플릿 불러오는 중" />
      ) : templates.isError ? (
        <ErrorState
          description={knowledgeErrorMessage(templates.error)}
          onRetry={() => void templates.refetch()}
        />
      ) : (
        templates.data.map((template) => (
          <TemplateEditor key={template.kind} template={template} />
        ))
      )}
    </section>
  );
}

function TemplateEditor({
  template,
}: {
  readonly template: KnowledgeTemplate;
}) {
  const id = useId();
  const client = useQueryClient();
  const [base, setBase] = useState(template);
  const [body, setBody] = useState(template.body);
  const [preview, setPreview] = useState(false);
  const save = useMutation({
    mutationFn: () => knowledgeApi.saveTemplate(base.kind, body),
    onSuccess: async (saved) => {
      setBase(saved);
      await client.invalidateQueries({ queryKey: knowledgeKeys.templates });
    },
  });
  return (
    <form
      className="template-editor grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!save.isPending) save.mutate();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${id}-title`}>{kindLabels[base.kind]}</h3>
        <div
          className="ui-segmented"
          role="group"
          aria-label={`${kindLabels[base.kind]} 보기`}
        >
          <button
            type="button"
            className="ui-segmented-option"
            aria-pressed={!preview}
            onClick={() => setPreview(false)}
          >
            작성
          </button>
          <button
            type="button"
            className="ui-segmented-option"
            aria-pressed={preview}
            onClick={() => setPreview(true)}
          >
            미리보기
          </button>
        </div>
      </div>
      {preview ? (
        <div className="postmortem-preview">
          <Markdown>{body || "본문이 비어 있습니다."}</Markdown>
        </div>
      ) : (
        <Textarea
          aria-labelledby={`${id}-title`}
          value={body}
          maxLength={20000}
          rows={8}
          disabled={save.isPending}
          onChange={(event) => {
            setBody(event.target.value);
            save.reset();
          }}
        />
      )}
      {save.isError && (
        <p role="alert" className="text-sm text-danger">
          {knowledgeErrorMessage(save.error)} 작성 내용은 유지됩니다.
        </p>
      )}
      {save.isSuccess && (
        <p role="status" className="text-sm text-muted">
          템플릿을 저장했습니다.{" "}
          {formatDate(base.updatedAt, {
            hour: "2-digit",
            minute: "2-digit",
          })}
          , {base.updatedBy?.name ?? "알 수 없음"}
        </p>
      )}
      <Button
        type="submit"
        variant="secondary"
        className="justify-self-end"
        loading={save.isPending}
        disabled={body === base.body}
      >
        템플릿 저장
      </Button>
    </form>
  );
}
