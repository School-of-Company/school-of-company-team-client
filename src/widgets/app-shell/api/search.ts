import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api";
import { searchTypes, type SearchResponse } from "../model/search";

export const searchQueries = {
  /** 검색어가 바뀌는 동안 이전 결과를 두어 목록이 깜빡이지 않게 한다. 폴링은 하지 않는다. */
  search: (query: string, limit = 5) =>
    queryOptions({
      queryKey: ["search", query, limit] as const,
      queryFn: async ({ signal }) =>
        (
          await api.get<SearchResponse>("/api/v1/search", {
            params: { q: query, types: searchTypes.join(","), limit },
            signal,
          })
        ).data,
      enabled: query.length > 0,
      placeholderData: keepPreviousData,
      staleTime: 15_000,
      retry: false,
    }),
};
