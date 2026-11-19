import { useMutation, useQueryClient } from "@tanstack/react-query";
import { incidentKeys } from "@/entities/incident";
import { knowledgeKeys, type KnowledgeDetail } from "@/entities/knowledge";

/**
 * 문서 변경 응답은 최신 상세라 바로 캐시에 넣는다. 목록, 서비스 Runbook 칸(목록 필터), 사고 상세(Runbook·관련 문서)는 다시 받는다.
 * 낙관적 갱신은 하지 않는다(편집 권한·관계 검사가 서버에 있다).
 */
export function useKnowledgeMutation<
  TInput,
  TOutput extends KnowledgeDetail | void,
>(mutationFn: (input: TInput) => Promise<TOutput>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (data) => {
      if (data) client.setQueryData(knowledgeKeys.detail(data.id), data);
      await Promise.all([
        client.invalidateQueries({
          queryKey: knowledgeKeys.all,
          predicate: (query) => query.queryKey[1] === "list",
        }),
        client.invalidateQueries({
          queryKey: incidentKeys.all,
          predicate: (query) => query.queryKey[1] === "detail",
        }),
      ]);
    },
  });
}
