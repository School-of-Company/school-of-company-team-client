import { useMutation, useQueryClient } from "@tanstack/react-query";
import { experimentKeys, type Experiment } from "@/entities/experiment";

/** 변경 응답은 최신 상세라 바로 캐시에 넣고, 목록은 다시 받는다. */
export function useExperimentMutation<
  TInput,
  TOutput extends Experiment | void,
>(mutationFn: (input: TInput) => Promise<TOutput>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (data) => {
      if (data) client.setQueryData(experimentKeys.detail(data.id), data);
      await client.invalidateQueries({
        queryKey: experimentKeys.all,
        predicate: (query) => query.queryKey[1] === "list",
      });
    },
  });
}
