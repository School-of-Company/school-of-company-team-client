import type { SprintGoalItem, SprintInput } from "@/entities/sprint";

export const GOAL_ITEM_LIMIT = 10;
export type GoalItemDraft = {
  readonly key: string;
  readonly id?: string;
  readonly text: string;
  readonly achieved?: boolean | null;
};

export function goalItemDrafts(
  items: readonly SprintGoalItem[] | undefined,
): readonly GoalItemDraft[] {
  return (items ?? []).map((item) => ({
    key: item.id,
    id: item.id,
    text: item.text,
    achieved: item.achieved,
  }));
}

/**
 * 빈 줄은 빼고 보낸다. 기존 항목은 id와 achieved를 같이 보내 달성 기록을 지킨다
 * (서버는 수정 때 achieved 생략을 null로 저장한다).
 */
export function goalItemsRequest(
  drafts: readonly GoalItemDraft[],
): SprintInput["goalItems"] {
  return drafts.flatMap((draft) => {
    const text = draft.text.trim();
    if (!text) return [];
    return [
      draft.id
        ? { id: draft.id, text, achieved: draft.achieved ?? null }
        : { text },
    ];
  });
}

export function goalItemsError(items: SprintInput["goalItems"]) {
  if (items.length > GOAL_ITEM_LIMIT)
    return `목표 항목은 ${GOAL_ITEM_LIMIT}개까지 쓸 수 있어요.`;
  if (items.some((item) => item.text.length > 200))
    return "목표 항목은 200자 이하로 입력하세요.";
  return undefined;
}

/** 0~1 비율을 정수 퍼센트로. null은 null. */
export function percent(rate: number | null | undefined) {
  return rate == null ? null : Math.round(rate * 100);
}
