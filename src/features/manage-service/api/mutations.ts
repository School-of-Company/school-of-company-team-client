import { useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceKeys, type ServiceDetail } from "@/entities/service";

/**
 * 서비스 변경은 응답이 최신 상세라 그 값을 바로 캐시에 넣고, 목록·그래프·이력은 다시 받는다.
 * 낙관적 갱신은 하지 않는다(소유자·저장소 권한 판정이 서버에 있다).
 */
export function useServiceMutation<
  TInput,
  TOutput extends ServiceDetail | void,
>(
  serviceId: string | undefined,
  mutationFn: (input: TInput) => Promise<TOutput>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (data) => {
      if (data) client.setQueryData(serviceKeys.detail(data.id), data);
      await client.invalidateQueries({
        queryKey: serviceKeys.all,
        predicate: (query) =>
          !(
            data &&
            query.queryKey[1] === "detail" &&
            query.queryKey[2] === data.id
          ),
      });
      if (!data && serviceId)
        await client.invalidateQueries({
          queryKey: serviceKeys.detail(serviceId),
        });
    },
  });
}
