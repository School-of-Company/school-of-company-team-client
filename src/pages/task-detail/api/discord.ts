import { api } from "@/shared/api";

export type Discussion = {
  readonly threadId: string;
  readonly url: string;
  readonly created: boolean;
  readonly archived: boolean;
  readonly locked: boolean;
  readonly verified: boolean;
};
export const taskDiscordApi = {
  open: async (taskId: string) =>
    (
      await api.post<Discussion>(
        `/api/v1/tasks/${encodeURIComponent(taskId)}/discord-thread`,
      )
    ).data,
  recover: async (taskId: string, threadId: string | null) => {
    await api.post(
      `/api/v1/tasks/${encodeURIComponent(taskId)}/discord-thread/recovery`,
      { threadId },
    );
  },
};
