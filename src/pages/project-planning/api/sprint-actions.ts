import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  sprintApi,
  sprintKeys,
  type CloseSprint,
  type RetroEntry,
  type RetroKind,
  type SprintInput,
} from "@/entities/sprint";
import {
  milestoneApi,
  milestoneKeys,
  type MilestoneInput,
} from "@/entities/milestone";
import { taskKeys } from "@/entities/task";

/** Sprint 상태·범위가 바뀌면 목록·상세·보드(sprint 필터)·업무 상세(sprint 속성)를 함께 맞춘다. */
function useRefreshSprints(projectId: string) {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: sprintKeys.list(projectId) }),
      client.invalidateQueries({ queryKey: taskKeys.all }),
    ]);
}

export function useCreateSprint(projectId: string) {
  const refresh = useRefreshSprints(projectId);
  return useMutation({
    mutationFn: (input: SprintInput) => sprintApi.create(projectId, input),
    onSuccess: refresh,
  });
}

export function useUpdateSprint(projectId: string, sprintId: string) {
  const refresh = useRefreshSprints(projectId);
  return useMutation({
    mutationFn: (input: SprintInput) =>
      sprintApi.update(projectId, sprintId, input),
    onSuccess: refresh,
  });
}

export function useSprintLifecycle(projectId: string, sprintId: string) {
  const refresh = useRefreshSprints(projectId);
  const client = useQueryClient();
  const start = useMutation({
    mutationFn: () => sprintApi.start(projectId, sprintId),
    onSettled: refresh,
  });
  const close = useMutation({
    mutationFn: (body: CloseSprint) =>
      sprintApi.close(projectId, sprintId, body),
    // 종료하면 서버가 초안을 저장 본문으로 둔다(D14-e). 결과 보고 탭이 바로 그 본문으로 열린다.
    onSuccess: (result) => {
      if (result.review)
        client.setQueryData(
          sprintKeys.review(projectId, sprintId),
          result.review,
        );
    },
    onSettled: refresh,
  });
  const capacity = useMutation({
    mutationFn: (value: number | null) =>
      sprintApi.updateCapacity(projectId, sprintId, value),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => sprintApi.remove(projectId, sprintId),
    onSuccess: () => {
      client.removeQueries({
        queryKey: sprintKeys.detail(projectId, sprintId),
      });
    },
    onSettled: refresh,
  });
  return { start, close, remove, capacity };
}

/** 계획 화면의 넣기·빼기. 화면 반영(낙관적)은 호출하는 쪽이 들고 실패하면 되돌린다. */
export function useSprintScope(projectId: string, sprintId: string) {
  const refresh = useRefreshSprints(projectId);
  return useMutation({
    mutationFn: async (
      change:
        | { readonly action: "add"; readonly taskIds: readonly string[] }
        | { readonly action: "remove"; readonly taskId: string },
    ) => {
      if (change.action === "add")
        await sprintApi.addTasks(projectId, sprintId, change.taskIds);
      else await sprintApi.removeTask(projectId, sprintId, change.taskId);
    },
    onSettled: refresh,
  });
}

export function useSaveReview(projectId: string, sprintId: string) {
  const client = useQueryClient();
  const key = sprintKeys.review(projectId, sprintId);
  const save = useMutation({
    mutationFn: (body: string) =>
      sprintApi.saveReview(projectId, sprintId, body),
    onSuccess: (review) => client.setQueryData(key, review),
  });
  const publish = useMutation({
    mutationFn: () => sprintApi.publishReview(projectId, sprintId),
    onSuccess: (review) => client.setQueryData(key, review),
  });
  return { save, publish };
}

export function useRetro(projectId: string, sprintId: string) {
  const client = useQueryClient();
  const key = sprintKeys.retro(projectId, sprintId);
  const settle = () => client.invalidateQueries({ queryKey: key });
  const create = useMutation({
    mutationFn: (body: { readonly kind: RetroKind; readonly body: string }) =>
      sprintApi.createRetro(projectId, sprintId, body),
    onSettled: settle,
  });
  const update = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      readonly id: string;
      readonly body: string;
    }) => sprintApi.updateRetro(projectId, sprintId, id, { body }),
    onSettled: settle,
  });
  // 삭제는 먼저 목록에서 빼고, 실패하면 이전 목록으로 되돌린다.
  const remove = useMutation({
    mutationFn: (id: string) => sprintApi.deleteRetro(projectId, sprintId, id),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<readonly RetroEntry[]>(key);
      if (previous)
        client.setQueryData(
          key,
          previous.filter((entry) => entry.id !== id),
        );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
    },
    onSettled: settle,
  });
  return { create, update, remove };
}

export function useMilestones(projectId: string) {
  const client = useQueryClient();
  const settle = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: milestoneKeys.list(projectId) }),
      client.invalidateQueries({ queryKey: taskKeys.all }),
    ]);
  const create = useMutation({
    mutationFn: (input: MilestoneInput) =>
      milestoneApi.create(projectId, input),
    onSuccess: settle,
  });
  const update = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      readonly id: string;
      readonly input: MilestoneInput;
    }) => milestoneApi.update(projectId, id, input),
    onSuccess: settle,
  });
  const remove = useMutation({
    mutationFn: (id: string) => milestoneApi.remove(projectId, id),
    onSettled: settle,
  });
  return { create, update, remove };
}
