import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/api";
import type { Project, ProjectKind, ProjectWorkflow } from "@/entities/project";

// 단계(stage)는 보내지 않는다. 서버가 검토(REVIEW)로 시작한다.
export type CreateProjectRequest = {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly visibility: "TEAM" | "MEMBERS";
  readonly kind: ProjectKind;
  readonly workflow: ProjectWorkflow;
};

export function useCreateProject(onSaved: () => Promise<unknown>) {
  return useMutation({
    mutationFn: async (body: CreateProjectRequest) => {
      return (await api.post<Project>("/api/v1/projects", body)).data;
    },
    onSuccess: onSaved,
  });
}
