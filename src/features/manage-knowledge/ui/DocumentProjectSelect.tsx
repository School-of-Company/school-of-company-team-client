"use client";

import { useId } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { projectAccess, projectQueries } from "@/entities/project";
import { useMe } from "@/entities/user";
import {
  knowledgeApi,
  knowledgeErrorMessage,
  type KnowledgeDetail,
} from "@/entities/knowledge";
import { Button, Select } from "@/shared/ui";
import { useKnowledgeMutation } from "../api/mutations";

export function DocumentProjectSelect({
  document,
}: {
  readonly document: KnowledgeDetail;
}) {
  const id = useId();
  const projects = useQuery(projectQueries.list());
  const viewer = useMe();
  const details = useQueries({
    queries: (projects.data ?? []).map((project) => ({
      ...projectQueries.detail(project.id),
      enabled:
        Boolean(viewer.data) &&
        !project.archived &&
        viewer.data?.role !== "LEAD" &&
        project.pmUserId !== viewer.data?.id,
      refetchInterval: false,
    })),
  });
  const writable = (projects.data ?? []).filter((project, index) => {
    const user = viewer.data;
    if (!user || project.archived) return false;
    if (user.role === "LEAD" || project.pmUserId === user.id) return true;
    const detail = details[index];
    return (
      detail.isSuccess &&
      !detail.isError &&
      projectAccess(detail.data, user).editable
    );
  });
  const move = useKnowledgeMutation((projectId: string | null) =>
    knowledgeApi.update(document.id, { projectId }),
  );
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="sr-only">
        문서 프로젝트
      </label>
      <Select
        id={id}
        value={document.project?.id ?? ""}
        disabled={projects.isPending || projects.isError || move.isPending}
        onChange={(event) => move.mutate(event.target.value || null)}
      >
        <option value="">조직</option>
        {document.project &&
          !writable.some((project) => project.id === document.project?.id) && (
            <option value={document.project.id} disabled>
              {document.project.name}
            </option>
          )}
        {writable.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </Select>
      {details.some((detail) => detail.isFetching) && (
        <p role="status" className="text-xs text-muted">
          프로젝트 권한 확인 중
        </p>
      )}
      {details.some((detail) => detail.isError) && (
        <p role="alert" className="text-xs text-danger">
          일부 프로젝트의 권한을 확인하지 못해 이동 대상에서 제외했습니다.{" "}
          <Button
            variant="ghost"
            onClick={() => {
              details
                .filter((detail) => detail.isError)
                .forEach((detail) => void detail.refetch());
            }}
          >
            다시 시도
          </Button>
        </p>
      )}
      {projects.isError && (
        <>
          <p role="alert" className="text-xs text-danger">
            프로젝트를 불러오지 못했습니다.
          </p>
          <Button variant="ghost" onClick={() => void projects.refetch()}>
            다시 시도
          </Button>
        </>
      )}
      {move.error && (
        <p role="alert" className="text-xs text-danger">
          {knowledgeErrorMessage(move.error)}
        </p>
      )}
      {move.isSuccess && (
        <p role="status" className="text-xs text-muted">
          프로젝트를 변경했습니다.
        </p>
      )}
    </div>
  );
}
