"use client";

import { useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { projectQueries } from "@/entities/project";
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
          !projects.data?.some(
            (project) => project.id === document.project?.id,
          ) && (
            <option value={document.project.id}>{document.project.name}</option>
          )}
        {projects.data
          ?.filter(
            (project) =>
              !project.archived || project.id === document.project?.id,
          )
          .map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
      </Select>
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
