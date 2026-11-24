import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  requirementKeys,
  type RequirementDetail,
} from "@/entities/requirement";
import { taskKeys } from "@/entities/task";

/**
 * 요구사항 변경. 상세를 돌려주는 응답은 바로 캐시에 넣고, 아니면 상세를 다시 받는다. 접수함은 늘 다시 받는다.
 * 낙관적 갱신은 하지 않는다(권한·상태 전이 판정이 서버에 있다).
 */
export function useRequirementChange<TInput, TOutput>(
  requirementId: string,
  mutationFn: (input: TInput) => Promise<TOutput>,
  options: { readonly tasksChanged?: boolean } = {},
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (data) => {
      const detail = data as RequirementDetail | undefined;
      if (detail && typeof detail === "object" && "sections" in detail)
        client.setQueryData(requirementKeys.detail(requirementId), detail);
      else
        await client.invalidateQueries({
          queryKey: requirementKeys.detail(requirementId),
        });
      await client.invalidateQueries({
        queryKey: requirementKeys.all,
        predicate: (query) => query.queryKey[1] === "list",
      });
      if (options.tasksChanged)
        await client.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
