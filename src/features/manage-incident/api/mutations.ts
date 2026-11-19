import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  incidentKeys,
  type IncidentDetail,
  type Postmortem,
} from "@/entities/incident";

/**
 * 사고 변경 응답은 최신 상세라 바로 캐시에 넣고 목록은 다시 받는다.
 * 낙관적 갱신은 하지 않는다(편집 권한·시각 규칙 판정이 서버에 있다). 응답이 없는 변경은 상세를 다시 받는다.
 */
export function useIncidentMutation<TInput, TOutput>(
  incidentId: string,
  mutationFn: (input: TInput) => Promise<TOutput>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (data) => {
      const detail = data as IncidentDetail | undefined;
      if (detail && typeof detail === "object" && "timeline" in detail)
        client.setQueryData(incidentKeys.detail(incidentId), detail);
      else
        await client.invalidateQueries({
          queryKey: incidentKeys.detail(incidentId),
        });
      await client.invalidateQueries({
        queryKey: incidentKeys.all,
        predicate: (query) => query.queryKey[1] === "list",
      });
    },
  });
}

/** 사후 검토 변경. 상세의 postmortemStatus 도 바뀌므로 사고 상세·목록을 함께 다시 받는다. */
export function usePostmortemMutation<TInput, TOutput>(
  incidentId: string,
  mutationFn: (input: TInput) => Promise<TOutput>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (data) => {
      const postmortem = data as Postmortem | undefined;
      if (
        postmortem &&
        typeof postmortem === "object" &&
        "actionItems" in postmortem
      )
        client.setQueryData(incidentKeys.postmortem(incidentId), postmortem);
      else
        await client.invalidateQueries({
          queryKey: incidentKeys.postmortem(incidentId),
        });
      await client.invalidateQueries({
        queryKey: incidentKeys.all,
        predicate: (query) => query.queryKey[1] !== "postmortem",
      });
    },
  });
}
