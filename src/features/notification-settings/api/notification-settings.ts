import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api";

export type NotificationKind =
  "ciFailed" | "reviewOverdue" | "deadlineDue" | "serviceDown";
export type NotificationSettings = Readonly<
  Record<Exclude<NotificationKind, "serviceDown">, boolean>
> & {
  /** 팀 공용(TEAM)에만 있다. 프로젝트 설정은 null 이고 보내면 400 이다. */
  readonly serviceDown: boolean | null;
  readonly scope: "TEAM" | "PROJECT";
  readonly projectId: string | null;
  /** 같은 범위의 Discord 채널 상태. ACTIVE가 아니면 켜져 있어도 보내지 않는다. */
  readonly channel: "ACTIVE" | "DISABLED" | "NONE";
  readonly updatedAt: string | null;
};

// projectId=null 은 팀 공용(헤드 어드민) 설정이다.
const path = (projectId: string | null) =>
  projectId === null
    ? "/api/v1/team/notification-settings"
    : `/api/v1/projects/${encodeURIComponent(projectId)}/notification-settings`;
const key = (projectId: string | null) =>
  ["notification-settings", projectId ?? "TEAM"] as const;

export function useNotificationSettings(projectId: string | null) {
  return useQuery({
    queryKey: key(projectId),
    queryFn: async () =>
      (await api.get<NotificationSettings>(path(projectId))).data,
    retry: false,
  });
}

/** 토글 하나만 보낸다. 화면은 먼저 바꾸고 실패하면 이전 값으로 되돌린다. */
export function useUpdateNotificationSetting(projectId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (change: Partial<Record<NotificationKind, boolean>>) =>
      (await api.patch<NotificationSettings>(path(projectId), change)).data,
    onMutate: async (change) => {
      await client.cancelQueries({ queryKey: key(projectId) });
      const previous = client.getQueryData<NotificationSettings>(
        key(projectId),
      );
      if (previous)
        client.setQueryData(key(projectId), { ...previous, ...change });
      return { previous };
    },
    onError: (_error, _change, context) => {
      if (context?.previous)
        client.setQueryData(key(projectId), context.previous);
    },
    onSuccess: (data) => client.setQueryData(key(projectId), data),
  });
}
