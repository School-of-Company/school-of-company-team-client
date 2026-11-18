import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/api";
import type { Project } from "@/entities/project";

export type CreateProjectRequest = {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly visibility: "TEAM" | "MEMBERS";
};

export function useCreateProject(onSaved: () => Promise<unknown>) {
  return useMutation({
    mutationFn: async (body: CreateProjectRequest) => {
      return (await api.post<Project>("/api/v1/projects", body)).data;
    },
    onSuccess: onSaved,
  });
}
