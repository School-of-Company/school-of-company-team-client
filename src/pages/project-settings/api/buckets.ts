import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectKeys, type PlanningBucket } from "@/entities/project";
import { taskKeys } from "@/entities/task";
import { api } from "@/shared/api";

export type BucketChange =
  | { readonly action: "create"; readonly name: string }
  | {
      readonly action: "rename";
      readonly bucketId: string;
      readonly name: string;
    }
  | {
      readonly action: "archive";
      readonly bucketId: string;
      readonly archived: boolean;
    }
  | { readonly action: "order"; readonly bucketIds: readonly string[] }
  | { readonly action: "delete"; readonly bucketId: string };

/** 화면에 먼저 반영할 결과. 생성·이름 변경은 서버 검증(중복 이름)이 있어 기다린다. */
function optimistic(
  buckets: readonly PlanningBucket[],
  change: BucketChange,
): readonly PlanningBucket[] | null {
  switch (change.action) {
    case "archive":
      return buckets.map((bucket) =>
        bucket.id === change.bucketId
          ? { ...bucket, archived: change.archived }
          : bucket,
      );
    case "order":
      return change.bucketIds.flatMap((id, position) => {
        const bucket = buckets.find((item) => item.id === id);
        return bucket ? [{ ...bucket, position }] : [];
      });
    case "delete":
      return buckets.filter((bucket) => bucket.id !== change.bucketId);
    default:
      return null;
  }
}

export function usePlanningBuckets(projectId: string) {
  const client = useQueryClient();
  const key = projectKeys.buckets(projectId);
  return useMutation({
    mutationFn: async (change: BucketChange) => {
      const base = `/api/v1/projects/${encodeURIComponent(projectId)}/planning-buckets`;
      switch (change.action) {
        case "create":
          await api.post(base, { name: change.name });
          return;
        case "rename":
          await api.patch(`${base}/${change.bucketId}`, { name: change.name });
          return;
        case "archive":
          await api.patch(`${base}/${change.bucketId}`, {
            archived: change.archived,
          });
          return;
        case "order":
          await api.put(`${base}/order`, { bucketIds: change.bucketIds });
          return;
        case "delete":
          await api.delete(`${base}/${change.bucketId}`);
          return;
        default: {
          const unreachable: never = change;
          return unreachable;
        }
      }
    },
    onMutate: async (change) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<readonly PlanningBucket[]>(key);
      const next = previous && optimistic(previous, change);
      if (next) client.setQueryData(key, next);
      return { previous };
    },
    onError: (_error, _change, context) => {
      // 실패하면 낙관적으로 바꾼 목록을 되돌린다.
      if (context?.previous) client.setQueryData(key, context.previous);
    },
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: key }),
        // 버킷 이름·보관·삭제는 보드 레인과 카드에도 보인다.
        client.invalidateQueries({ queryKey: taskKeys.all }),
      ]);
    },
  });
}
