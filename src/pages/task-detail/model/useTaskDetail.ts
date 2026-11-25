"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  forgetTask,
  isGoneError,
  taskApi,
  taskKeys,
  taskQueries,
  type TaskSize,
} from "@/entities/task";
import { sprintKeys } from "@/entities/sprint";
import { projectQueries } from "@/entities/project";
import { milestoneQueries } from "@/entities/milestone";
import { activeUsersQueryOptions } from "@/entities/user";
import { normalizeApiError } from "@/shared/api";
import { useToast } from "@/shared/ui";

export function useTaskDetail(taskId: string) {
  const client = useQueryClient();
  const toast = useToast();
  const [denied, setDenied] = useState<unknown>(null);
  // 404·403을 받은 상세는 다시 받지 않는다(10초 폴링·재마운트가 같은 404를 되풀이하지 않게). 다시 시도는 수동 refetch.
  const lastError = client.getQueryState(taskKeys.detail(taskId))?.error;
  const gone = !!lastError && isGoneError(lastError);
  const task = useQuery({
    ...taskQueries.detail(taskId),
    enabled: !denied && !gone,
  });
  // 프로젝트 상세도 404·403이면 다시 받지 않는다(업무는 200인데 프로젝트만 404인 경우의 폴링·정리 반복 방지).
  const projectError = client.getQueryState(
    projectQueries.detail(task.data?.projectId ?? "").queryKey,
  )?.error;
  const project = useQuery({
    ...projectQueries.detail(task.data?.projectId ?? ""),
    enabled:
      !denied &&
      !!task.data?.projectId &&
      !(projectError && isGoneError(projectError)),
  });
  const buckets = useQuery({
    ...projectQueries.buckets(task.data?.projectId ?? ""),
    enabled: !denied && task.data?.scope === "PROJECT" && !!task.data.projectId,
  });
  const milestones = useQuery({
    ...milestoneQueries.list(task.data?.projectId ?? ""),
    enabled: !denied && task.data?.scope === "PROJECT" && !!task.data.projectId,
  });
  const changeBucket = useMutation({
    mutationFn: (planningBucketId: string) =>
      taskApi.update(taskId, { planningBucketId }),
    onSuccess: async () => {
      toast("계획 버킷을 변경했습니다.", "success");
      await client.invalidateQueries({ queryKey: taskKeys.all });
    },
    onError: (cause) => {
      const problem = normalizeApiError(cause);
      toast(problem.message, "error");
      if (problem.status === 403 || problem.status === 404) setDenied(cause);
    },
  });
  const changeSize = useMutation({
    mutationFn: (size: TaskSize | null) => taskApi.update(taskId, { size }),
    onSuccess: async () => {
      toast("크기를 변경했습니다.", "success");
      await Promise.all([
        client.invalidateQueries({ queryKey: taskKeys.all }),
        // Sprint 크기 합계가 바뀐다.
        client.invalidateQueries({
          queryKey: sprintKeys.list(task.data?.projectId ?? ""),
        }),
      ]);
    },
    onError: (cause) => {
      const problem = normalizeApiError(cause);
      toast(problem.message, "error");
      if (problem.status === 403 || problem.status === 404) setDenied(cause);
    },
  });
  const changeMilestone = useMutation({
    mutationFn: (milestoneId: string) =>
      taskApi.update(taskId, { milestoneId }),
    onSuccess: async () => {
      toast("마일스톤을 변경했습니다.", "success");
      await Promise.all([
        client.invalidateQueries({ queryKey: taskKeys.all }),
        // 진행률이 바뀐다.
        client.invalidateQueries({
          queryKey: milestoneQueries.list(task.data?.projectId ?? "").queryKey,
        }),
      ]);
    },
    onError: (cause) => {
      const problem = normalizeApiError(cause);
      toast(problem.message, "error");
      if (problem.status === 403 || problem.status === 404) setDenied(cause);
    },
  });
  const assignees = useQuery({
    ...activeUsersQueryOptions(),
    enabled: task.data?.scope === "TEAM" && !denied,
  });
  const projectProblem = project.error
    ? normalizeApiError(project.error)
    : null;
  const taskError =
    denied ||
    task.error ||
    (projectProblem &&
    (projectProblem.status === 403 || projectProblem.status === 404)
      ? project.error
      : null);
  // 404 응답 하나에 정리 한 번(forgetTask가 QueryClient 단위로 응답 시각을 기억). 목록 제외는 매번 한다.
  // 기준 시각은 오류가 난 쪽의 응답 시각이다(업무·프로젝트). 거부(denied)는 effect가 도는 시각.
  const errorAt =
    taskError && taskError === task.error
      ? task.errorUpdatedAt
      : taskError && taskError === project.error
        ? project.errorUpdatedAt
        : 0;
  useEffect(() => {
    if (!taskError) return;
    const problem = normalizeApiError(taskError);
    if (problem.status === 403 || problem.status === 404)
      forgetTask(client, taskId, errorAt || Date.now());
  }, [taskError, errorAt, client, taskId]);
  const changeStatus = useMutation({
    mutationFn: (status: Parameters<typeof taskApi.move>[1]["status"]) =>
      taskApi.move(taskId, { status, prevId: null, nextId: null }),
    onSuccess: async () => {
      toast("상태를 변경했습니다.", "success");
      await client.invalidateQueries({ queryKey: taskKeys.all });
    },
    onError: (cause) => {
      const problem = normalizeApiError(cause);
      toast(problem.message, "error");
      if (problem.status === 403 || problem.status === 404) setDenied(cause);
    },
  });
  return {
    task,
    project,
    buckets,
    milestones,
    assignees,
    taskError,
    setDenied,
    changeStatus,
    changeBucket,
    changeSize,
    changeMilestone,
  };
}
