import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/api";
import type {
  ProjectKind,
  ProjectStage,
  ProjectWorkflow,
} from "@/entities/project";

export type UpdateProjectRequest = {
  readonly name: string;
  readonly description: string;
  readonly visibility: "TEAM" | "MEMBERS";
  // 생략하면 서버가 그대로 둔다. PM·헤드 어드민(프로젝트 ADMIN)만 바꿀 수 있다.
  readonly stage?: ProjectStage;
  readonly kind?: ProjectKind;
  readonly workflow?: ProjectWorkflow;
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

export function useProjectImage(
  projectId: string,
  onSaved: () => Promise<unknown>,
) {
  return useMutation({
    mutationFn: async (file: File | null) => {
      const path = `/api/v1/projects/${encodeURIComponent(projectId)}/image`;
      if (file === null) {
        await api.delete(path);
      } else {
        const form = new FormData();
        form.append("file", file);
        await api.post(path, form);
      }
    },
    onSuccess: onSaved,
  });
}
