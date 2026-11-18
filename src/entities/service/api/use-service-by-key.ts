import { useQuery } from "@tanstack/react-query";
import { serviceQueries } from "./services";

/**
 * 화면 주소는 불변 key(`/services/{key}`)이고 API는 ID를 받는다. 운영 중 목록 → 없으면 아카이브 목록에서 찾는다.
 * 두 목록 모두 목록 화면과 같은 쿼리 키라 목록에서 들어오면 추가 요청이 없다.
 */
export function useServiceByKey(key: string) {
  const active = useQuery(serviceQueries.list(false));
  const inActive = active.data?.find((service) => service.key === key);
  const archived = useQuery({
    ...serviceQueries.list(true),
    enabled: active.isSuccess && !inActive,
  });
  const found =
    inActive ?? archived.data?.find((service) => service.key === key);
  const error = active.error ?? archived.error;
  return {
    id: found?.id,
    // 목록 재조회가 실패해도 이미 찾은 서비스는 그대로 보여 준다.
    error: found ? null : error,
    notFound: !found && active.isSuccess && archived.isSuccess,
    pending: !found && !error && !(active.isSuccess && archived.isSuccess),
    refetch: () => {
      void active.refetch();
      void archived.refetch();
    },
  };
}
