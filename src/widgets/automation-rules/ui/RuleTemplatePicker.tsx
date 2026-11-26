"use client";

import { useQuery } from "@tanstack/react-query";
import { normalizeApiError } from "@/shared/api";
import { Dialog, ErrorState, ListSkeleton } from "@/shared/ui";
import { ruleTemplatesQuery } from "../api/rules";
import { ruleErrorMessage, templateToForm, type RuleForm } from "../model/rule";

/** 서버 내장 템플릿 목록. 고르면 그 값으로 채운 새 규칙 편집 창을 연다(저장은 편집 창에서). */
export function RuleTemplatePicker({
  open,
  onClose,
  onPick,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onPick: (form: RuleForm) => void;
}) {
  const templates = useQuery({ ...ruleTemplatesQuery, enabled: open });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="템플릿에서 만들기"
      className="rule-dialog"
    >
      <p className="mb-4 text-sm text-muted">
        고르면 새 규칙 편집 창이 채워져요. 저장하기 전에 고칠 수 있어요.
      </p>
      {templates.isPending ? (
        <ListSkeleton label="템플릿 불러오는 중" rows={4} rowClassName="h-16" />
      ) : templates.isError ? (
        <ErrorState
          title="템플릿을 불러오지 못했어요"
          description={ruleErrorMessage(normalizeApiError(templates.error))}
          onRetry={() => void templates.refetch()}
        />
      ) : (
        <ul className="rule-template-list" aria-label="규칙 템플릿">
          {templates.data.map((template) => (
            <li key={template.key}>
              <button
                type="button"
                className="rule-template"
                onClick={() => onPick(templateToForm(template))}
              >
                <span className="text-sm font-semibold">{template.name}</span>
                <span className="text-xs text-muted">
                  {template.description}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
