import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/api";

export type UpdateProjectRequest = {
  readonly name: string;
  readonly description: string;
  readonly visibility: "TEAM" | "MEMBERS";
};

export function useUpdateProject(
  projectId: string,
  onSaved: () => Promise<unknown>,
) {
  return useMutation({
    mutationFn: async (body: UpdateProjectRequest) => {
      await api.patch(`/api/v1/projects/${projectId}`, body);
    },
    onSuccess: onSaved,
  });
}

export function useAssignPm(
  projectId: string,
  onSaved: () => Promise<unknown>,
) {
  return useMutation({
    mutationFn: async (userId: string | null) => {
      await api.put(`/api/v1/projects/${projectId}/pm`, { userId });
    },
    onSuccess: onSaved,
  });
}
