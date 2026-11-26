import { queryOptions } from "@tanstack/react-query";
import type { TaskStatus } from "@/entities/task";
import { api } from "@/shared/api";

// 계약: 서버 docs/spec/s22-mcp-v3.md 5·6절(TaskCommentDtos.kt).

export interface TaskPersonSummary {
  readonly id: string;
  readonly username: string;
  readonly name: string;
  readonly avatarUrl?: string | null;
}

export interface TaskComment {
  readonly id: string;
  readonly taskId: string;
  readonly body: string;
  readonly author: TaskPersonSummary | null;
  readonly viaAgent: boolean;
  readonly createdAt: string;
  readonly editedAt: string | null;
}

export interface TaskHistoryEntry {
  /** null = 생성. */
  readonly from: TaskStatus | null;
  readonly to: TaskStatus;
  readonly changedAt: string;
  /** V34 이전 기록은 null. */
  readonly actor: TaskPersonSummary | null;
  readonly viaAgent: boolean;
}

const base = (taskId: string) => `/api/v1/tasks/${encodeURIComponent(taskId)}`;

// "tasks" 아래에 두어 업무를 바꿀 때(taskKeys.all 무효화) 이력도 다시 받는다.
export const commentKeys = {
  list: (taskId: string) => ["tasks", "comments", taskId] as const,
  history: (taskId: string) => ["tasks", "history", taskId] as const,
};

export const commentApi = {
  list: async (taskId: string) =>
    (await api.get<readonly TaskComment[]>(`${base(taskId)}/comments`)).data,
  create: async (taskId: string, body: string) =>
    (await api.post<TaskComment>(`${base(taskId)}/comments`, { body })).data,
  update: async (taskId: string, commentId: string, body: string) =>
    (
      await api.patch<TaskComment>(
        `${base(taskId)}/comments/${encodeURIComponent(commentId)}`,
        { body },
      )
    ).data,
  delete: async (taskId: string, commentId: string) => {
    await api.delete(
      `${base(taskId)}/comments/${encodeURIComponent(commentId)}`,
    );
  },
  history: async (taskId: string) =>
    (await api.get<readonly TaskHistoryEntry[]>(`${base(taskId)}/history`))
      .data,
};

export const commentQueries = {
  list: (taskId: string) =>
    queryOptions({
      queryKey: commentKeys.list(taskId),
      queryFn: () => commentApi.list(taskId),
      retry: false,
    }),
  history: (taskId: string) =>
    queryOptions({
      queryKey: commentKeys.history(taskId),
      queryFn: () => commentApi.history(taskId),
      retry: false,
    }),
};
