import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  milestoneApi,
  milestoneKeys,
  type MilestoneInput,
} from "@/entities/milestone";
import { taskKeys } from "@/entities/task";

/** 목록, 로드맵, 상세는 같은 접두 키라 한 번에 맞춘다. 업무 상세의 마일스톤 속성도 함께. */
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
      previous,
    }: {
      readonly id: string;
      readonly input: MilestoneInput;
      readonly previous: MilestoneInput;
    }) => milestoneApi.update(projectId, id, input, previous),
    onSuccess: settle,
  });
  const remove = useMutation({
    mutationFn: (id: string) => milestoneApi.remove(projectId, id),
    onSettled: settle,
  });
  const sprint = useMutation({
    mutationFn: ({
      milestoneId,
      sprintId,
      linked,
    }: {
      readonly milestoneId: string;
      readonly sprintId: string;
      readonly linked: boolean;
    }) =>
      linked
        ? milestoneApi.linkSprint(projectId, milestoneId, sprintId)
        : milestoneApi.unlinkSprint(projectId, milestoneId, sprintId),
    onSettled: settle,
  });
  return { create, update, remove, sprint };
}
