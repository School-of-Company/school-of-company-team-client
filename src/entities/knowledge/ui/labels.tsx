import {
  kindDescriptions,
  kindLabels,
  knowledgeStatusLabels,
  type KnowledgeKind,
  type KnowledgeStatus,
} from "../model/types";

export function KindLabel({ kind }: { readonly kind: KnowledgeKind }) {
  return (
    <span className="knowledge-kind" title={kindDescriptions[kind]}>
      {kindLabels[kind]}
    </span>
  );
}

/** 초안은 점선, 게시는 채움, 폐기는 취소선 이름. 색만으로 구분하지 않는다. */
export function KnowledgeStatusLabel({
  status,
}: {
  readonly status: KnowledgeStatus;
}) {
  return (
    <span className="knowledge-status" data-status={status}>
      {knowledgeStatusLabels[status]}
    </span>
  );
}
