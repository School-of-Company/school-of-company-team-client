"use client";
import { useId, useState } from "react";
import {
  requirementApi,
  requirementErrorMessage,
  type MessageVisibility,
  type RequirementDetail,
} from "@/entities/requirement";
import { formatDate } from "@/shared/lib";
import { Badge, Button, Field, Textarea, useToast } from "@/shared/ui";
import { useRequirementChange } from "../api/change";
const dateTime = { hour: "2-digit", minute: "2-digit" } as const;

export function Messages({
  requirement,
}: {
  readonly requirement: RequirementDetail;
}) {
  const id = useId();
  const toast = useToast();
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<MessageVisibility>("INTERNAL");
  const [error, setError] = useState<string | null>(null);
  const add = useRequirementChange(
    requirement.id,
    (input: { body: string; visibility: MessageVisibility }) =>
      requirementApi.addMessage(requirement.id, input),
  );
  const remove = useRequirementChange(requirement.id, (messageId: string) =>
    requirementApi.removeMessage(requirement.id, messageId),
  );
  return (
    <section
      className="requirement-card grid gap-4"
      aria-labelledby="req-messages"
    >
      <h2 id="req-messages">메시지</h2>
      {requirement.messages.length === 0 ? (
        <p className="text-sm text-muted">아직 메시지가 없어요.</p>
      ) : (
        <ol className="grid gap-3">
          {requirement.messages.map((message) => (
            <li
              key={message.id}
              className={`grid gap-1 rounded-xl p-4 ${message.visibility === "INTERNAL" ? "bg-surface-box" : "bg-surface-fill"}`}
            >
              <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="font-medium text-foreground-2">
                  {message.authorKind === "REQUESTER"
                    ? "요청자"
                    : (message.author?.name ?? "탈퇴한 팀원")}
                </span>
                <Badge>
                  {message.visibility === "PUBLIC" ? "공개" : "내부 메모"}
                </Badge>
                <span>{formatDate(message.createdAt, dateTime)}</span>
                {message.canDelete && (
                  <Button
                    variant="ghost"
                    className="ui-button-sm ml-auto"
                    disabled={remove.isPending}
                    onClick={() =>
                      remove.mutate(message.id, {
                        onError: (problem) =>
                          toast(requirementErrorMessage(problem), "error"),
                      })
                    }
                  >
                    삭제
                  </Button>
                )}
              </p>
              <p className="text-sm break-words whitespace-pre-wrap">
                {message.body}
              </p>
            </li>
          ))}
        </ol>
      )}
      <form
        noValidate
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const text = body.trim();
          if (!text || text.length > 5000) {
            setError("내용은 1~5000자로 적어 주세요.");
            return;
          }
          if (add.isPending) return;
          add.mutate(
            { body: text, visibility },
            {
              onSuccess: () => {
                setBody("");
                setError(null);
              },
              onError: (problem) => setError(requirementErrorMessage(problem)),
            },
          );
        }}
      >
        {requirement.canManage && (
          <div
            className="ui-segmented"
            role="radiogroup"
            aria-label="공개 범위"
          >
            {(
              [
                ["INTERNAL", "내부 메모"],
                ["PUBLIC", "요청자에게 답변"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="ui-segmented-option">
                <input
                  type="radio"
                  name={`${id}-visibility`}
                  value={value}
                  checked={visibility === value}
                  onChange={() => setVisibility(value)}
                />
                {label}
              </label>
            ))}
          </div>
        )}
        <Field
          id={`${id}-body`}
          label={visibility === "PUBLIC" ? "요청자에게 보낼 답변" : "내부 메모"}
          hint={
            visibility === "PUBLIC"
              ? "요청자 상태 페이지에 '팀' 이름으로 보여요."
              : "팀원에게만 보여요."
          }
          error={error ?? undefined}
        >
          <Textarea
            id={`${id}-body`}
            maxLength={5000}
            value={body}
            aria-invalid={!!error || undefined}
            onChange={(event) => setBody(event.target.value)}
          />
        </Field>
        <div>
          <Button type="submit" loading={add.isPending}>
            {visibility === "PUBLIC" ? "답변 보내기" : "메모 남기기"}
          </Button>
        </div>
      </form>
    </section>
  );
}
