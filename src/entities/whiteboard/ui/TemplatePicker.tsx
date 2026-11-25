"use client";

import type { ReactNode } from "react";
import { Badge } from "@/shared/ui";
import { groupTemplates } from "../model/templates";
import type { WhiteboardTemplate } from "../model/types";
import { TemplateThumbnail } from "./TemplateThumbnail";

/** 분류별 템플릿 격자. 라디오 하나를 고른다. actions 는 카드 아래 덧붙는 버튼(팀 템플릿 관리). */
export function TemplatePicker({
  name,
  templates,
  value,
  onChange,
  actions,
}: {
  readonly name: string;
  readonly templates: readonly WhiteboardTemplate[];
  readonly value: string;
  readonly onChange: (templateId: string) => void;
  readonly actions?: (template: WhiteboardTemplate) => ReactNode;
}) {
  return (
    <div className="grid gap-4">
      {groupTemplates(templates).map((group) => (
        <fieldset key={group.category} className="grid gap-2">
          <legend className="mb-2 text-sm font-semibold text-muted">
            {group.label}
          </legend>
          <div className="whiteboard-template-grid">
            {group.templates.map((template) => (
              <div key={template.id} className="whiteboard-template">
                <label className="grid cursor-pointer gap-2">
                  <input
                    type="radio"
                    className="sr-only"
                    name={name}
                    value={template.id}
                    checked={value === template.id}
                    onChange={() => onChange(template.id)}
                  />
                  <TemplateThumbnail scene={template.scene} />
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-semibold">
                      {template.name}
                    </span>
                    {template.source === "TEAM" && <Badge>팀</Badge>}
                  </span>
                  <span className="whiteboard-template-description">
                    {template.description}
                  </span>
                </label>
                {actions?.(template)}
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
