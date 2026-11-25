import {
  whiteboardTemplateCategories,
  whiteboardTemplateCategoryLabels,
  type WhiteboardTemplate,
  type WhiteboardTemplateCategory,
} from "./types";

export type TemplateGroup = {
  readonly category: WhiteboardTemplateCategory;
  readonly label: string;
  readonly templates: readonly WhiteboardTemplate[];
};

/** 분류 순서(기본, 회의, 계획, 다이어그램)로 묶는다. 묶음 안은 서버 순서(내장 다음 팀 템플릿)를 지킨다. 빈 분류는 뺀다. */
export function groupTemplates(
  templates: readonly WhiteboardTemplate[],
): readonly TemplateGroup[] {
  return whiteboardTemplateCategories
    .map((category) => ({
      category,
      label: whiteboardTemplateCategoryLabels[category],
      templates: templates.filter(
        (template) =>
          // 모르는 분류(서버가 새로 더한 것)는 기본에 둔다.
          (whiteboardTemplateCategories.includes(template.category)
            ? template.category
            : "BASIC") === category,
      ),
    }))
    .filter((group) => group.templates.length > 0);
}
